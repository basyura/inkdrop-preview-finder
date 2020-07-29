"use babel";

import { CompositeDisposable } from "event-kit";

class PreviewFinder {
  subscriptions = new CompositeDisposable();
  activate() {
    const { commands } = inkdrop;
    this.subscriptions.add(
      commands.add(document.body, { "preview-finder:find": this.find })
    );
  }
  /*
   *
   */
  find = () => {
    const pane = document.querySelector(".mde-preview");
    let nodeIterator = document.createNodeIterator(
      pane,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: this.acceptNode,
      },
      false
    );

    let nodes = [];
    for (let node; (node = nodeIterator.nextNode()); ) {
      nodes.push(node);
      console.log(node);
    }
  };

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

  deactivate() {},
};
