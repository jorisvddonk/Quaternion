const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

var plugins = [
  new HtmlWebpackPlugin({
    template: 'index.html',
    inject: 'head'
  })
];
if (process.env.NODE_ENV === 'production') {
  plugins.push(new UglifyJsPlugin({}));
}
module.exports = {
  entry: './js/main.js',
  output: {
    path: path.resolve('./dist/'),
    filename: 'bundle.js'
  },
  plugins: plugins,
  module: {
    rules: []
  }
};
