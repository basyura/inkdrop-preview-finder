"use babel";

import { CompositeDisposable } from "event-kit";

class PreviewFinder {
  noteId = "";
  word = "";
  matchedNodes = [];
  matchedIndex = -999;
  isComposing = false;
  lastNoteBody = "";
  paneElement = null;
  finderElement = null;
  cleanupFloatingFinder = null;

  subscriptions = new CompositeDisposable();
  /*
   *
   */
  activate() {
    const { commands } = inkdrop;
    this.subscriptions.add(
      commands.add(document.body, {
        "preview-finder:open": this.openFinder,
        "preview-finder:next": this.findNext,
        "preview-finder:prev": this.findPrev,
      })
    );
    this.attachEvents();
    this.observeStore();
  }
  /*
   *
   */
  attachEvents() {
    // clear mark
    const pane = this.getPreviewPane();
    if (!pane) {
      return;
    }

    if (this.paneElement && this.paneElement !== pane) {
      this.paneElement.removeEventListener("keydown", this.handlePaneKeyDown);
    }
    if (this.paneElement === pane) {
      return;
    }

    this.paneElement = pane;

    pane.addEventListener("keydown", this.handlePaneKeyDown);
  }
  /*
   *
   */
  observeStore() {
    const unsubscribe = inkdrop.store.subscribe(this.handleStoreUpdate);
    this.subscriptions.add({ dispose: unsubscribe });
    this.handleStoreUpdate();
  }
  /*
   *
   */
  handleStoreUpdate = () => {
    const { editingNote } = inkdrop.store.getState();
    const noteId = editingNote ? editingNote._id : "";
    const noteBody = editingNote ? editingNote.body : "";
    if (this.noteId !== noteId || this.lastNoteBody !== noteBody) {
      this.noteId = "";
      this.lastNoteBody = noteBody;
      this.clear();
    }
  };
  /*
   *
   */
  handleCmUpdate = () => {
    // todo: remove remain nodes.
    this.matchedNodes.forEach((v) => {
      try {
        v.parentNode.removeChild(v.nextSibling);
      } catch (e) {}
      try {
        v.parentNode.removeChild(v);
      } catch (e) {}
    });
    // initialize
    this.noteId = "";
    this.matchedNodes = [];
    this.matchedIndex = -999;
  };
  /*
   *
   */
  openFinder = () => {
    this.attachEvents();
    this.noteId = this.getEditingNoteId();
    const pane = this.getPreviewPane();
    if (!pane) {
      return;
    }

    const current = pane.querySelector(".preview-finder");
    if (current) {
      this.removeFinder();
    }

    const ele = document.createElement("div");
    ele.classList.add("preview-finder");
    ele.style.position = "fixed";
    ele.style.zIndex = "10";
    ele.style.display = "block";
    ele.style.padding = "8px";
    ele.style.boxSizing = "border-box";

    const input = document.createElement("input");
    input.style.outline = "none";
    input.style.display = "block";
    input.style.width = "100%";
    input.style.boxSizing = "border-box";
    ele.appendChild(input);
    input.onblur = this.handleBlur;
    input.onkeydown = this.handleKeyDown;
    input.onkeyup = this.handleKeyup;

    pane.appendChild(ele);
    this.finderElement = ele;
    this.updateFinderPosition();
    this.observeFinderPosition();
    input.focus();
  };
  /*
   *
   */
  findNext = () => this.findLoop("next");
  /*
   *
   */
  findPrev = () => this.findLoop("prev");
  /*
   *
   */
  findLoop = (mode) => {
    if (this.word == "") {
      return;
    }
    // check switch note
    const id = this.getEditingNoteId();
    if (this.noteId != id) {
      this.noteId = id;
      this.findNodes();
    }

    if (this.matchedNodes.length == 0) {
      return;
    }

    if (this.matchedIndex >= 0) {
      this.matchedNodes[this.matchedIndex].classList.remove(
        "preview-finder-matched"
      );
    }

    if (mode == "next") {
      this.matchedIndex++;
      // first search
      if (this.matchedIndex <= -100) {
        for (let i = 0; i < this.matchedNodes.length; i++) {
          if (this.matchedNodes[i].getBoundingClientRect().y > 0) {
            this.matchedIndex = i;
            break;
          }
        }
      }
      if (this.matchedIndex < 0 || this.matchedNodes.length <= this.matchedIndex) {
        this.matchedIndex = 0;
      }
    } else {
      this.matchedIndex--;
      if (this.matchedIndex < 0 || this.matchedNodes.length <= this.matchedIndex) {
        this.matchedIndex = this.matchedNodes.length - 1;
      }
    }

    const node = this.matchedNodes[this.matchedIndex];
    //const parent = this.matchedNodes[this.matchedIndex].parentNode;
    node.classList.add("preview-finder-matched");
    const top = node.getBoundingClientRect().y;
    const pane = this.getPreviewPane();
    const paneTop = pane.getBoundingClientRect().y;
    // adjust scroll top
    if (top < paneTop || paneTop + pane.clientHeight < top) {
      node.scrollIntoView();
      pane.scrollTop -= pane.clientHeight / 4;
    }
  };
  /*
   *
   */
  handlePaneKeyDown = (ev) => {
    if (ev.key == "Escape") {
      this.noteId = "";
      this.clear();
      this.removeFinder();
      const pane = this.getPreviewPane();
      if (pane) {
        pane.focus();
      }
    }
  };
  /*
   *
   */
  handleBlur = (ev) => {
    this.removeFinder();
  };
  /*
   *
   */
  clear = () => {
    const nodes = this.matchedNodes;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i] && nodes[i].parentNode && nodes[i].firstChild) {
        // https://developer.mozilla.org/ja/docs/Web/API/Node/replaceChild
        // replacedNode = parentNode.replaceChild(newChild, oldChild);
        // replace to mark's textnode
        // a<mark>b</mark>c -> abc
        nodes[i].parentNode.replaceChild(nodes[i].firstChild, nodes[i]);
      }
    }
    // bind split nodes
    const pane = this.getPreviewPane();
    if (pane) {
      pane.normalize();
    }
    this.matchedNodes = [];
    this.matchedIndex = -999;
  };
  /*
   *
   */
  handleKeyDown = (ev) => {
    this.isComposing = ev.isComposing;
    ev.cancelBubble = true;
  };
  /*
   *
   */
  handleKeyup = (ev) => {
    // event filter
    if (ev.key != "Enter" && ev.isComposing) {
      return;
    }
    // key filter
    if (["Control", "Shift"].indexOf(ev.key) >= 0) {
      return;
    }
    // decide
    const pane = this.getPreviewPane();
    if (ev.key == "Enter" && !this.isComposing) {
      pane.focus();
      this.findNext();
      return;
    }
    // cancel
    if (ev.key == "Escape") {
      this.clear();
      pane.focus();
      return;
    }
    // check length
    this.word = ev.srcElement.value;
    if (this.word.length < 1) {
      this.clear();
      return;
    }

    this.findNodes();
  };
  /*
   *
   */
  findNodes = () => {
    this.clear();
    const pane = this.getPreviewPane();
    if (!pane) {
      return;
    }

    let nodeIterator = document.createNodeIterator(
      pane,
      NodeFilter.SHOW_TEXT,
      { acceptNode: this.acceptNode },
      false
    );
    let nodes = [];
    for (let node; (node = nodeIterator.nextNode()); ) {
      const idx = node.textContent
        .toLocaleLowerCase()
        .indexOf(this.word.toLowerCase());
      if (idx < 0) {
        continue;
      }
      nodes.push(node);
    }

    const markBase = document.createElement("mark");
    nodes.forEach((node) => {
      let mark = markBase.cloneNode(false);
      const idx = node.textContent
        .toLocaleLowerCase()
        .indexOf(this.word.toLowerCase());
      const mid = node.splitText(idx);
      mid.splitText(this.word.length);
      mark.appendChild(mid.cloneNode(false));
      mid.parentNode.replaceChild(mark, mid);

      this.matchedNodes.push(mark);
    });
  };
  /*
   *
   */
  getPreviewPane = () => {
    return document.querySelector(".mde-preview-container, .mde-preview");
  };
  /*
   *
   */
  updateFinderPosition = () => {
    const pane = this.getPreviewPane();
    const finder = this.finderElement;
    if (!pane || !finder) {
      return;
    }

    const rect = pane.getBoundingClientRect();
    finder.style.left = `${rect.left}px`;
    finder.style.width = `${rect.width}px`;
    finder.style.bottom = `${Math.max(window.innerHeight - rect.bottom, 0)}px`;
  };
  /*
   *
   */
  observeFinderPosition = () => {
    if (this.cleanupFloatingFinder) {
      this.cleanupFloatingFinder();
    }

    const update = this.updateFinderPosition;
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    this.cleanupFloatingFinder = () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      this.cleanupFloatingFinder = null;
    };
  };
  /*
   *
   */
  removeFinder = () => {
    if (this.cleanupFloatingFinder) {
      this.cleanupFloatingFinder();
    }

    if (this.finderElement && this.finderElement.parentNode) {
      this.finderElement.parentNode.removeChild(this.finderElement);
    }
    this.finderElement = null;
  };
  /*
   *
   */
  getEditingNoteId = () => {
    const { editingNote } = inkdrop.store.getState();
    return editingNote ? editingNote._id : "";
  };
  /*
   *
   */
  isVisible = (element) => {
    if (!(element instanceof Element)) {
      return false;
    }
    return (
      element.offsetParent &&
      !element.disabled &&
      element.getAttribute("type") !== "hidden" &&
      getComputedStyle(element).visibility !== "hidden" &&
      element.getAttribute("display") !== "none"
    );
  };
  /*
   *
   */
  acceptNode = (node) => {
    if (!node.data.trim()) {
      return NodeFilter.FILTER_REJECT;
    }
    switch (node.parentNode.localName.toLowerCase()) {
      case "script":
      case "style":
      case "noscript":
      case "mark":
        return NodeFilter.FILTER_REJECT;
    }
    return this.isVisible(node.parentNode)
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_REJECT;
  };
}

const plugin = new PreviewFinder();

module.exports = {
  activate() {
    plugin.activate();
  },

  deactivate() {
    if (plugin.paneElement) {
      plugin.paneElement.removeEventListener("keydown", plugin.handlePaneKeyDown);
      plugin.paneElement = null;
    }
    plugin.removeFinder();
    plugin.subscriptions.dispose();
  },

  find(word) {
    plugin.word = word;
    plugin.noteId = "";
    plugin.findNext();
  },
};
