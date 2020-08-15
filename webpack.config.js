/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");

const appConfig = {
  mode: "development",
  entry: "./src/index.ts",
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
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        "./src/index.html",
        "./src/icons.svg",
        {from: "./docs", to: "./docs"}
      ]
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css"
    })
  ],
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              // you can specify a publicPath here
              // by default it use publicPath in webpackOptions.output
              publicPath: "../"
            }
          },
          //"style-loader",
          "css-loader",
          "sass-loader"
        ]
      },
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.ts$/,
        exclude: /(node_modules)/,
        use: [
          {
            loader: "babel-loader"
          },
          {
            loader: "ts-loader"
          }
        ]
      },
      {
        test: /\.rle$/,
        use: "raw-loader"
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js", ".json"]
  }
};

const workerConfig = {
  mode: "development",
  target: "webworker",
  entry: "./src/worker.ts",
  output: {
    filename: "worker.js",
    path: path.resolve(__dirname, "dist"),
    globalObject: "self"
  },
  devServer: {
    contentBase: "./dist"
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /(node_modules)/,
        use: [
          {
            loader: "babel-loader"
          },
          {
            loader: "ts-loader"
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".js", ".wasm"]
  }
};

module.exports = [appConfig, workerConfig];
