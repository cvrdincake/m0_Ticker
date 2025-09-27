const path = require('path');
const globals = require('globals');
const htmlPlugin = require('eslint-plugin-html');

const legacyConfig = require(path.join(__dirname, '.eslintrc.json'));
const eslintRecommended = require('eslint/conf/eslint-recommended');
const prettierConfig = require('eslint-config-prettier');

const parserOptions = legacyConfig.parserOptions || {};
const baseEnv = legacyConfig.env || {};

function resolveGlobals(env = {}) {
  return {
    ...(env.browser ? globals.browser : {}),
    ...(env.node ? globals.node : {})
  };
}

const baseRules = {
  ...(eslintRecommended && eslintRecommended.rules ? eslintRecommended.rules : {}),
  ...(prettierConfig && prettierConfig.rules ? prettierConfig.rules : {}),
  ...(legacyConfig.rules || {})
};

const overrides = legacyConfig.overrides || [];
const serverConfig = overrides[0] || {};
const publicConfig = overrides[1] || {};

module.exports = [
  {
    ignores: ['backup/**', 'node_modules/**']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: parserOptions.ecmaVersion || 'latest',
      sourceType: parserOptions.sourceType || 'script',
      globals: resolveGlobals(baseEnv)
    },
    plugins: {
      html: htmlPlugin
    },
    rules: baseRules
  },
  {
    files: serverConfig.files || [],
    languageOptions: {
      ecmaVersion: parserOptions.ecmaVersion || 'latest',
      sourceType: parserOptions.sourceType || 'script',
      globals: resolveGlobals(serverConfig.env)
    }
  },
  {
    files: publicConfig.files || [],
    languageOptions: {
      ecmaVersion: parserOptions.ecmaVersion || 'latest',
      sourceType: parserOptions.sourceType || 'script',
      globals: {
        ...resolveGlobals(publicConfig.env),
        ...((publicConfig.globals) || {})
      }
    }
  }
];
