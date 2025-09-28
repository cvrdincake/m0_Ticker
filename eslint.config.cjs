// eslint.config.cjs
const js = require("@eslint/js");
const htmlPlugin = require("eslint-plugin-html");
const prettierConfig = require("eslint-config-prettier");

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
      globals: require("globals").node,
    },
    plugins: {
      html: htmlPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...(prettierConfig && prettierConfig.rules ? prettierConfig.rules : {}),
    },
  },
  // Node.js environment for public JS (CommonJS modules) with 'self' global
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...require("globals").node,
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
];

