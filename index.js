import React from "react";
import ReactDOM from "react-dom";
import "./styles.css";
import { Grid } from "./Grid";

class HelloMessage extends React.Component {
  render() {
    return <Grid />;
  }
}

var mountNode = document.getElementById("app");
ReactDOM.render(<HelloMessage name="Bill" />, mountNode);
