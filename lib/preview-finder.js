"use babel";

import { CompositeDisposable } from "event-kit";

class PreviewFinder {
  matchedNodes = [];
  subscriptions = new CompositeDisposable();
  /*
   *
   */
  activate() {
    const { commands } = inkdrop;
    this.subscriptions.add(commands.add(document.body, { "preview-finder:find": this.find }));
  }
  /*
   *
   */
  find = () => {
    const pane = this.getPreviewPane();
    const ele = document.createElement("div");
    ele.style.position = "absolute";
    ele.style.top = pane.scrollTop + pane.getBoundingClientRect().height - 30 + "px";

    const input = document.createElement("input");
    input.style.width = pane.getBoundingClientRect().width - 20 + "px";
    input.style.outline = "none";
    //input.style.border = "none";
    ele.appendChild(input);
    input.onblur = this.handleBlur;
    input.onkeydown = () => (event.cancelBubble = true);
    input.onkeyup = this.handleKeyup;

    pane.appendChild(ele);
    input.focus();
  };
  /*
   *
   */
  handleBlur = (ev) => {
    console.log("handleBlur start");
    const pane = this.getPreviewPane();
    pane.removeChild(ev.srcElement.parentNode);
    this.clear();
  };
  /*
   *
   */
  clear = () => {
    const nodes = this.matchedNodes;
    console.log(`clear start. nodes.legnth : ` + nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      console.log(nodes[i]);
      if (nodes[i]) {
        console.log("nodes true");
      }
      if (nodes[i].parentNode) {
        console.log("parent true");
      }
      if (nodes[i].firstChild) {
        console.log("first true");
      } else {
        console.log(nodes[i].firstChild);
      }

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
  };
  /*
   *
   */
  handleKeyup = (ev) => {
    //console.log(ev);
    // event filter
    if (ev.key != "Enter" && ev.isComposing) {
      return;
    }
    // key filter
    if (["Control", "Shift"].indexOf(ev.key) >= 0) {
      return;
    }
    // finish
    const pane = this.getPreviewPane();
    if (ev.key == "Escape") {
      pane.focus();
      return;
    }
    // check length
    const word = ev.srcElement.value;
    //console.log(input.value + " -> " + input.value.length);
    if (word.length < 2) {
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
