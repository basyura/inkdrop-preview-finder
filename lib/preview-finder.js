"use babel";

import { CompositeDisposable } from "event-kit";

class PreviewFinder {
  matchedNodes = [];
  matchedIndex = -1;
  isComposing = false;

  subscriptions = new CompositeDisposable();
  /*
   *
   */
  activate() {
    const { commands } = inkdrop;
    this.subscriptions.add(
      commands.add(document.body, {
        "preview-finder:find": this.find,
        "preview-finder:find-next": this.findNext,
        "preview-finder:find-prev": this.findPrev,
      })
    );
  }
  /*
   *
   */
  find = () => {
    const pane = this.getPreviewPane();
    const ele = document.createElement("div");
    ele.classList.add("preview-finder");

    const input = document.createElement("input");
    input.style.width = pane.getBoundingClientRect().width - 20 + "px";
    input.style.outline = "none";
    //input.style.border = "none";
    ele.appendChild(input);
    input.onblur = this.handleBlur;
    input.onkeydown = this.handleKeyDown;
    input.onkeyup = this.handleKeyup;

    pane.appendChild(ele);
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
    console.log(`findNext: len = ${this.matchedNodes.length}`);
    if (this.matchedNodes.length == 0) {
      return;
    }

    if (this.matchedIndex >= 0) {
      this.matchedNodes[this.matchedIndex].classList.remove("preview-finder-matched");
    }

    if (mode == "next") {
      this.matchedIndex++;
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
    const parent = this.matchedNodes[this.matchedIndex].parentNode;
    node.classList.add("preview-finder-matched");
    // todo:
    node.scrollIntoView();

    if (parent.tagName == "A") {
      parent.focus();
      parent.classList.add("preview-finder-focus");
      // leak ?
      parent.onblur = (ev) => {
        ev.srcElement.classList.remove("preview-finder-focus");
      };
    }
  };
  /*
   *
   */
  handleBlur = (ev) => {
    console.log("handleBlur start");
    const pane = this.getPreviewPane();
    pane.removeChild(ev.srcElement.parentNode);
    //this.clear();
  };
  /*
   *
   */
  clear = () => {
    const nodes = this.matchedNodes;
    console.log(`clear start. nodes.legnth : ` + nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i] && nodes[i].parentNode && nodes[i].firstChild) {
        console.log(`nodes[${i}]: ` + nodes[i]);
        // https://developer.mozilla.org/ja/docs/Web/API/Node/replaceChild
        // replacedNode = parentNode.replaceChild(newChild, oldChild);
        // replace to mark's textnode
        // a<mark>b</mark>c -> abc
        nodes[i].parentNode.replaceChild(nodes[i].firstChild, nodes[i]);
      }
    }
    // bind split nodes
    this.getPreviewPane().normalize();
    this.matchedNodes = [];
    this.matchedIndex = -1;
  };
  /*
   *
   */
  handleKeyDown = (ev) => {
    this.isComposing = ev.isComposing;
    ev.cancelBubble = true;
    if (ev.ctrlKey && ev.key == "n") {
      //console.log("next search");
    }
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
    const word = ev.srcElement.value;
    console.log(word + " -> " + word.length);
    if (word.length < 1) {
      this.clear();
      return;
    }

    this.clear(ev);
    // create span
    let nodeIterator = document.createNodeIterator(
      pane,
      NodeFilter.SHOW_TEXT,
      { acceptNode: this.acceptNode },
      false
    );
    let nodes = [];
    for (let node; (node = nodeIterator.nextNode()); ) {
      const idx = node.textContent.toLocaleLowerCase().indexOf(word.toLowerCase());
      if (idx < 0) {
        continue;
      }
      console.log(node.textContent + ", " + node.textContent.length + ", " + idx);
      nodes.push(node);
    }

    console.log("matchedNodes: " + word + " -> " + nodes.length);

    this.matchedNodes = [];
    this.matchedIndex = -1;
    const markBase = document.createElement("mark");
    nodes.forEach((node) => {
      let mark = markBase.cloneNode(false);
      const idx = node.textContent.toLocaleLowerCase().indexOf(word.toLowerCase());
      console.log(
        `idx : ${node.textContent.toLocaleLowerCase()} / ${word.toLowerCase()} -> ${idx}`
      );
      const mid = node.splitText(idx);
      mid.splitText(word.length);
      mark.appendChild(mid.cloneNode(true));
      mid.parentNode.replaceChild(mark, mid);

      this.matchedNodes.push(mark);
    });
  };
  /*
   *
   */
  getPreviewPane = () => {
    return document.querySelector(".mde-preview");
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
    return this.isVisible(node.parentNode) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
  };
}

const plugin = new PreviewFinder();

module.exports = {
  activate() {
    plugin.activate();
  },

  deactivate() {},
};
