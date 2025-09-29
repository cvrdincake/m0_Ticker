// eslint.config.cjs
const js = require("@eslint/js");
const htmlPlugin = require("eslint-plugin-html");
const prettierConfig = require("eslint-config-prettier");
const globals = require("globals");

module.exports = [
  {
    ignores: ["backup/**", "node_modules/**"],
  },
  // Node.js environment for server and tests
  {
    files: ["server.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: globals.node,
    },
    plugins: {
      html: htmlPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...(prettierConfig && prettierConfig.rules ? prettierConfig.rules : {}),
    },
  },
  // Browser environment for public JS files  
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.node,
        self: "readonly",
      },
    },
    plugins: {
      html: htmlPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...(prettierConfig && prettierConfig.rules ? prettierConfig.rules : {}),
    },
  },
  // Files that use custom classes
  {
    files: ["public/js/dashboard-init.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.node,
        self: "readonly",
        StateManager: "readonly",
        TickerWebSocket: "readonly",
        PopupManager: "readonly",
        BrbManager: "readonly", 
        BRBManager: "readonly",
        SlateManager: "readonly",
      },
    },
    plugins: {
      html: htmlPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...(prettierConfig && prettierConfig.rules ? prettierConfig.rules : {}),
    },
  },
];

