import React from "react";
import ReactDOM from "react-dom";
import "./styles.css";
import { GameContainer } from "./GameContainer";

class HelloMessage extends React.Component {
  render() {
    return <GameContainer />;
  }
}

var mountNode = document.getElementById("app");
ReactDOM.render(<HelloMessage name="Bill" />, mountNode);
