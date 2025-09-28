// eslint.config.cjs
const js = require("@eslint/js");
const htmlPlugin = require("eslint-plugin-html");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  {
    ignores: ["backup/**", "node_modules/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
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

