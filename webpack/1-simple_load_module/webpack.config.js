const path = require('path')
const merge = require('webpack-merge')
const base = require('../webpack.base.js')

module.exports = merge(base, {
  output: {
    path: path.resolve(__dirname, 'dist'),
  }
})