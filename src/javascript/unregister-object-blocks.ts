/**
 * Unregisters blocks for non Museum Object post types.
 */

// Global `wp` provided by the WordPress wp-dom-ready / wp-blocks scripts;
// declared locally since no global `wp` declaration exists in src/types.
declare const wp: {
  domReady: (callback: () => void) => void;
  blocks: {
    unregisterBlockType: (name: string) => unknown;
  };
};

wp.domReady(function () {
  wp.blocks.unregisterBlockType("wp-museum/object-image-attachments-block");
  wp.blocks.unregisterBlockType("wp-museum/object-meta-block");
  wp.blocks.unregisterBlockType("wp-museum/child-objects-block");
});
