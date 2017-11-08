var webpack = require('webpack'),
    path = require('path');
module.exports = {
    entry: {
        app: './index.js'
    },
    output: {
        path: path.resolve(__dirname, './'),
        filename: 'dist.js'
    }
}