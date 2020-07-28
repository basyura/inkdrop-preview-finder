'use babel';

import PreviewFinderMessageDialog from './preview-finder-message-dialog';

module.exports = {

  activate() {
    inkdrop.components.registerClass(PreviewFinderMessageDialog);
    inkdrop.layouts.addComponentToLayout(
      'modal',
      'PreviewFinderMessageDialog'
    )
  },

  deactivate() {
    inkdrop.layouts.removeComponentFromLayout(
      'modal',
      'PreviewFinderMessageDialog'
    )
    inkdrop.components.deleteClass(PreviewFinderMessageDialog);
  }

};
