/* eslint-disable no-undef */
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

const appConfig = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    globalObject: "this"
  },
  devServer: {
    contentBase: "./dist",
    host: "0.0.0.0",
    port: 1234
  },
  plugins: [new CopyWebpackPlugin(["./src/index.html", "./src/styles.css"])],
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
      },
      {
        test: /\.rle$/,
        use: "raw-loader"
      }
    ]
  }
};

const workerConfig = {
  mode: "development",
  target: "webworker",
  entry: "./src/worker.js",
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
