const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

var plugins = [];
if (process.env.NODE_ENV === 'production') {
  plugins.push(new UglifyJsPlugin({}));
}

module.exports = {
  entry: './js/main.js',
  output: {
    filename: 'dist/bundle.js'
  },
  plugins: plugins,
  module: {
    rules: []
  }
};
