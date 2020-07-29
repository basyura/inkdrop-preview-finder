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

    const nodes = this.matchedNodes;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i] && nodes[i].parentNode && nodes[i].firstChild) {
        nodes[i].parentNode.replaceChild(nodes[i].firstChild, nodes[i]);
      }
    }
    //document.documentElement.normalize();
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
    const input = ev.srcElement;
    //console.log(input.value + " -> " + input.value.length);
    if (input.value.length < 3) {
      return;
    }
    // create span
    let nodeIterator = document.createNodeIterator(
      pane,
      NodeFilter.SHOW_TEXT,
      { acceptNode: this.acceptNode },
      false
    );
    // match
    const markBase = document.createElement("mark");
    this.matchedNodes = [];
    for (let node; (node = nodeIterator.nextNode()); ) {
      let idx = node.textContent.toLocaleLowerCase().indexOf(input.value.toLowerCase());
      if (idx < 0) {
        continue;
      }

      console.log(node.textContent + ", " + node.textContent.length + ", " + idx);

      var mark = markBase.cloneNode(false);
      const mid = node.splitText(idx);
      mid.splitText(node.textContent.length);
      mark.appendChild(mid.cloneNode(true));
      mid.parentNode.replaceChild(mark, mid);

      this.matchedNodes.push(node);
    }
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
