/* eslint-disable no-undef */
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

const appConfig = {
  mode: "development",
  entry: "./index.js",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    globalObject: "this"
  },
  devServer: {
    contentBase: "./dist",
    port: 1234
  },
  plugins: [new CopyWebpackPlugin(["./index.html", "./styles.css"])],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  }
};

const workerConfig = {
  mode: "development",
  target: "webworker",
  entry: "./worker.js",
  output: {
    filename: "worker.js",
    path: path.resolve(__dirname, "dist"),
    globalObject: "self"
  },
  devServer: {
    contentBase: "./dist"
  },
  resolve: {
    extensions: [".js", ".wasm"]
  }
};

module.exports = [appConfig, workerConfig];
