import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Box, Grommet, dark } from "grommet";
import "./sass/app.sass";
import Centered from "./components/centered";
import VideoPlayer from "./components/video_player";
import Login from "./components/login";
import {observer} from "mobx-react";
import state from "./model/state";

const App = () => {
  return (
    <Grommet theme={dark} themeMode="dark">
      <Box
        fill={true}
        background="black"
        align="center"
        justify="center"
        style={{ position: "absolute", left: "0px", top: "0px" }}
      >
        <h1>MomentTV</h1>
        <Login />
      </Box>
    </Grommet>
  );
};

ReactDOM.render(<App />, document.getElementById("app"));
