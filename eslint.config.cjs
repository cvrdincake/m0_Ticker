const { FlatCompat } = require('@eslint/eslintrc');
const path = require('path');

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const legacyConfig = require(path.join(__dirname, '.eslintrc.json'));

module.exports = [
  {
    ignores: ['backup/**', 'node_modules/**']
  },
  ...compat.config(legacyConfig)
];
