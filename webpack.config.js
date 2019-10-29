/* eslint-disable no-undef */
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
  mode: "development",
  entry: "./bootstrap.js",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist")
  },
  devServer: {
    contentBase: "./dist",
    port: 1234
  },
  plugins: [new CopyWebpackPlugin(["index.html", "styles.css"])]
};
