"use babel";

import { CompositeDisposable } from "event-kit";

class PreviewFinder {
  noteId = "";
  word = "";
  matchedRanges = [];
  matchedIndex = -999;
  isComposing = false;
  lastNoteBody = "";
  lastNoteId = "";
  paneElement = null;
  finderElement = null;
  cleanupFloatingFinder = null;
  searchStyleProbe = null;
  searchStyleElement = null;
  searchStyleFrame = null;

  subscriptions = new CompositeDisposable();
  /*
   *
   */
  activate() {
    this.subscriptions = new CompositeDisposable();
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
    this.observeSearchStyles();
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
    if (this.lastNoteId !== noteId || this.lastNoteBody !== noteBody) {
      this.lastNoteId = noteId;
      this.noteId = "";
      this.lastNoteBody = noteBody;
      this.clear();
    }
  };
  /*
   * Read the cascade in an editor-shaped, detached copy, never in React's DOM.
   */
  updateSearchStyles = () => {
    const content =
      inkdrop.getActiveEditor?.()?.contentDOM ||
      document.querySelector(".cm-editor .cm-content");
    if (content) {
      const line = document.createElement("div");
      line.className = "cm-line";
      let root = line;
      for (
        let node = content;
        node && node !== document.body && node !== document.documentElement;
        node = node.parentElement
      ) {
        const parent = node.cloneNode(false);
        parent.appendChild(root);
        root = parent;
      }
      root.setAttribute("data-preview-finder-style-probe", "");
      root.setAttribute("aria-hidden", "true");
      root.setAttribute("inert", "");
      root.style.setProperty("position", "fixed", "important");
      root.style.setProperty("left", "-100000px", "important");
      root.style.setProperty("visibility", "hidden", "important");
      this.searchStyleProbe = { root, line };
    }
    // Keep the editor's scope classes when only the preview is mounted.
    if (!this.searchStyleProbe) {
      return;
    }

    const { root, line } = this.searchStyleProbe;
    const sample = document.createElement("span");
    sample.textContent = "match";
    line.appendChild(sample);
    document.body.appendChild(root);
    let css;
    try {
      const properties = [
        "background-color",
        "color",
        "text-shadow",
        "text-decoration-line",
        "text-decoration-color",
        "text-decoration-style",
        "text-decoration-thickness",
        "-webkit-text-fill-color",
        "-webkit-text-stroke-color",
        "-webkit-text-stroke-width",
      ];
      css = ["preview-finder-results", "preview-finder-matched"]
        .map((name, index) => {
          sample.className =
            "cm-searchMatch" + (index ? " cm-searchMatch-selected" : "");
          const computed = window.getComputedStyle(sample);
          const declaration = document.createElement("span").style;
          for (const property of properties) {
            declaration.setProperty(property, computed.getPropertyValue(property));
          }
          return `::highlight(${name}) { ${declaration.cssText} }`;
        })
        .join("\n");
    } finally {
      root.remove();
      sample.remove();
    }

    if (!this.searchStyleElement) {
      this.searchStyleElement = document.createElement("style");
      document.head.appendChild(this.searchStyleElement);
    }
    if (this.searchStyleElement.textContent !== css) {
      this.searchStyleElement.textContent = css;
    }
  };

  scheduleSearchStyleUpdate = () => {
    if (this.searchStyleFrame !== null) {
      return;
    }
    this.searchStyleFrame = window.requestAnimationFrame(() => {
      this.searchStyleFrame = null;
      this.updateSearchStyles();
    });
  };

  observeSearchStyles = () => {
    this.updateSearchStyles();
    const observer = new MutationObserver((records) => {
      const changed = records.some((record) => {
        if (record.target === this.searchStyleElement) {
          return false;
        }
        const nodes = [...record.addedNodes, ...record.removedNodes];
        if (
          record.type === "childList" &&
          nodes.every(
            (node) =>
              node === this.searchStyleElement ||
              (node.nodeType === Node.ELEMENT_NODE &&
                node.hasAttribute("data-preview-finder-style-probe"))
          )
        ) {
          return false;
        }
        if (
          document.head.contains(record.target) ||
          record.target.parentElement?.closest("style") ||
          (record.target.nodeType === Node.ELEMENT_NODE &&
            record.target.matches("style"))
        ) {
          return true;
        }
        if (record.type === "attributes") {
          return (
            record.target === document.documentElement ||
            record.target === document.body ||
            record.target.matches(".cm-editor") ||
            !!record.target.closest(".cm-editor") ||
            !!record.target.querySelector(".cm-editor")
          );
        }
        return nodes.some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches('.cm-editor, style, link[rel="stylesheet"]') ||
              node.querySelector('.cm-editor, style, link[rel="stylesheet"]'))
        );
      });
      if (changed) {
        this.scheduleSearchStyleUpdate();
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "href", "media", "disabled"],
      characterData: true,
    });
    const appearance = window.matchMedia("(prefers-color-scheme: dark)");
    appearance.addEventListener("change", this.scheduleSearchStyleUpdate);
    document.head.addEventListener("load", this.scheduleSearchStyleUpdate, true);
    this.subscriptions.add({
      dispose: () => {
        observer.disconnect();
        appearance.removeEventListener("change", this.scheduleSearchStyleUpdate);
        document.head.removeEventListener(
          "load",
          this.scheduleSearchStyleUpdate,
          true
        );
        if (this.searchStyleFrame !== null) {
          window.cancelAnimationFrame(this.searchStyleFrame);
          this.searchStyleFrame = null;
        }
        this.searchStyleElement?.remove();
        this.searchStyleElement = null;
        this.searchStyleProbe = null;
      },
    });
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

    this.removeFinder();

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

    // Keep the finder outside the preview subtree managed by React.
    document.body.appendChild(ele);
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
    const pane = this.getPreviewPane();
    if (!pane) {
      this.clear();
      return;
    }
    if (
      this.noteId != id ||
      this.matchedRanges.some(
        (range) => range.collapsed || !pane.contains(range.startContainer)
      )
    ) {
      this.noteId = id;
      this.findNodes();
    }

    if (this.matchedRanges.length == 0) {
      return;
    }

    this.updateSearchStyles();

    if (mode == "next") {
      this.matchedIndex++;
      // first search
      if (this.matchedIndex <= -100) {
        for (let i = 0; i < this.matchedRanges.length; i++) {
          if (this.matchedRanges[i].getBoundingClientRect().y > 0) {
            this.matchedIndex = i;
            break;
          }
        }
      }
      if (this.matchedIndex < 0 || this.matchedRanges.length <= this.matchedIndex) {
        this.matchedIndex = 0;
      }
    } else {
      this.matchedIndex--;
      if (this.matchedIndex < 0 || this.matchedRanges.length <= this.matchedIndex) {
        this.matchedIndex = this.matchedRanges.length - 1;
      }
    }

    const range = this.matchedRanges[this.matchedIndex];
    const activeHighlight = new window.Highlight(range);
    activeHighlight.priority = 1;
    window.CSS.highlights.set("preview-finder-matched", activeHighlight);
    const top = range.getBoundingClientRect().y;
    const paneTop = pane.getBoundingClientRect().y;
    // adjust scroll top
    if (top < paneTop || paneTop + pane.clientHeight < top) {
      pane.scrollTop += top - paneTop - pane.clientHeight / 4;
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
    // Never normalize or replace React-owned text nodes.
    if (window.CSS && window.CSS.highlights) {
      window.CSS.highlights.delete("preview-finder-results");
      window.CSS.highlights.delete("preview-finder-matched");
    }
    this.matchedRanges = [];
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
    if (!pane) {
      this.clear();
      this.removeFinder();
      return;
    }
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
    if (
      !pane ||
      !this.word ||
      !window.CSS ||
      !window.CSS.highlights ||
      typeof window.Highlight !== "function"
    ) {
      return;
    }

    this.updateSearchStyles();
    let nodeIterator = document.createNodeIterator(
      pane,
      NodeFilter.SHOW_TEXT,
      { acceptNode: this.acceptNode },
      false
    );
    const pattern = new RegExp(
      this.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "giu"
    );
    const highlight = new window.Highlight();
    for (let node; (node = nodeIterator.nextNode());) {
      pattern.lastIndex = 0;
      for (let match; (match = pattern.exec(node.data));) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        this.matchedRanges.push(range);
        highlight.add(range);
      }
    }
    window.CSS.highlights.set("preview-finder-results", highlight);
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

    const finder = this.finderElement;
    // Removing a focused input can synchronously call handleBlur again.
    this.finderElement = null;
    if (finder && finder.parentNode) {
      finder.parentNode.removeChild(finder);
    }
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
    plugin.clear();
    plugin.noteId = "";
    plugin.subscriptions.dispose();
  },

  find(word) {
    plugin.word = word;
    plugin.noteId = "";
    if (!word) {
      plugin.clear();
      return;
    }
    plugin.findNext();
  },
};
