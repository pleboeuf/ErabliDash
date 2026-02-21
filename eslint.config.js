const js = require('@eslint/js')
const nodePlugin = require('eslint-plugin-n')
const promisePlugin = require('eslint-plugin-promise')

module.exports = [
  js.configs.recommended,
  nodePlugin.configs['flat/recommended'],
  promisePlugin.configs['flat/recommended'],
  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'n/no-unpublished-require': 'off'
    }
  },
  {
    ignores: ['node_modules/', 'public/bower_components/']
  }
]
