const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const { getWebpackEntryPoints } = require("@wordpress/scripts/utils/config");
const RemoveEmptyScriptsPlugin = require("webpack-remove-empty-scripts");

module.exports = {
  ...defaultConfig,
  entry: {
    ...getWebpackEntryPoints("script")(),
    admin: {
      import: [
        "./src/admin-react/src/index.js",
        "./src/admin-react/src/admin.scss",
      ],
      filename: "admin-react.js",
    },
    remote: {
      import: "./museum-remote/src/index.js",
      filename: "museum-remote-admin.js",
    },
    "remote-front": {
      import: "./museum-remote/src/frontend.js",
      filename: "museum-remote-front.js",
    },
    components: {
      import: ["./src/components/index.js", "./src/components/style.scss"],
      filename: "components.js",
    },
    "museum-block-front": {
      import: "./src/blocks/front.scss",
    },
    "museum-block-editor": {
      import: "./src/blocks/editor.scss",
    },
    "museum-oai-pmh-toggle": {
      import: "./src/javascript/oai-pmh-toggle.tsx",
    },
  },
  plugins: [...defaultConfig.plugins, new RemoveEmptyScriptsPlugin()],
};
