import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./sass/app.sass";
import * as foo from "./control/socket";
import VideoPlayer from "./components/video_player";

const App = () => {
  return (
    <div>
      <VideoPlayer />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("app"));
