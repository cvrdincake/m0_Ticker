const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      'arrow-parens': ['error', 'as-needed'],
      'max-len': ['error', 110, { ignoreComments: true, ignoreUrls: true }],
      'no-trailing-spaces': 'error',
      'object-curly-spacing': ['error', 'always']
    }
  },
  {
    files: ['assets/js/dashboard/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        URL: 'readonly',
        WebSocket: 'readonly',
        structuredClone: 'readonly'
      }
    }
  }
];
