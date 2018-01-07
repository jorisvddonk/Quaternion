var LiveReloadPlugin = require('webpack-livereload-plugin');

module.exports = {
  entry: './js/main.js',
  output: {
    filename: 'dist/bundle.js'
  },
  plugins: [
    new LiveReloadPlugin({})
  ],
  module: {
    rules: [
    ]
  }
};