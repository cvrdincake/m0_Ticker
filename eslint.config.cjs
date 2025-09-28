// eslint.config.cjs
const path = require("path");
const globals = require("globals");
const htmlPlugin = require("eslint-plugin-html");
const js = require("@eslint/js");
const prettierConfig = require("eslint-config-prettier");

// Load legacy config for parserOptions, env, overrides, etc.
const legacyConfig = require(path.join(__dirname, ".eslintrc.json"));

const parserOptions = legacyConfig.parserOptions || {};
const baseEnv = legacyConfig.env || {};

function resolveGlobals(env = {}) {
  return {
    ...(env.browser ? globals.browser : {}),
    ...(env.node ? globals.node : {}),
  };
}

const baseRules = {
  ...js.configs.recommended.rules,
  ...(prettierConfig && prettierConfig.rules ? prettierConfig.rules : {}),
  ...(legacyConfig.rules || {}),
};

const overrides = legacyConfig.overrides || [];
const serverConfig = overrides[0] || {};
const publicConfig = overrides[1] || {};

module.exports = [
  {
    ignores: ["backup/**", "node_modules/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: parserOptions.ecmaVersion || "latest",
      sourceType: parserOptions.sourceType || "script",
      globals: resolveGlobals(baseEnv),
    },
    plugins: {
      html: htmlPlugin,
    },
    rules: baseRules,
  },
  {
    files: serverConfig.files || [],
    languageOptions: {
      ecmaVersion: parserOptions.ecmaVersion || "latest",
      sourceType: parserOptions.sourceType || "script",
      globals: resolveGlobals(serverConfig.env),
    },
  },
  {
    files: publicConfig.files || [],
    languageOptions: {
      ecmaVersion: parserOptions.ecmaVersion || "latest",
      sourceType: parserOptions.sourceType || "script",
      globals: {
        ...resolveGlobals(publicConfig.env),
        ...(publicConfig.globals || {}),
      },
    },
  },
];

