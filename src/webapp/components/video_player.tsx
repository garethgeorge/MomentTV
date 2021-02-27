import React, { useState, useRef } from "react";
import dashjs from "dashjs";
import {Expand} from "grommet-icons/icons/Expand";
import "../sass/icon_play.sass";

export default () => {
  const [playing, setPlaying] = useState(false);
  const wrapper = useRef(null);
  let videoDom;

  return (
    <div ref={wrapper}>
      {!playing ? (
        <button
          className="icon-play"
          onClick={() => {
            videoDom.play();
            setPlaying(true);
          }}
        ></button>
      ) : null}
      <video
        autoPlay={false}
        muted={false}
        controls={false}
        ref={async (videoDom_) => {
          videoDom = videoDom_;
          const player = dashjs.MediaPlayer().create();
          player.initialize(videoDom, "/stream/live/default.mpd", true);
          player.updateSettings({
            streaming: {
              liveDelay: 1,
              liveCatchUpMinDrift: 0.05,
              liveCatchUpPlaybackRate: 0.5,
              stableBufferTime: 10,
              bufferTimeAtTopQuality: 10,
              bufferTimeAtTopQualityLongForm: 10,
              bufferToKeep: 30,
              lowLatencyEnabled: true,
              fastSwitchEnabled: true,
              abr: {
                limitBitrateByPortal: true,
              },
            },
          } as any);
        }}
      ></video>
      <button
        className="invisible"
        style={{ position: "absolute", bottom: "5px", right: "5px" }}
        onClick={() => {
          let fullscreenElem = document.fullscreenElement;
          if (fullscreenElem) {
            // release fullscreen 
            document.exitFullscreen();
          } else {
            // request fullscreen 
            if (wrapper.current.requestFullscreen) {
              wrapper.current.requestFullscreen();
            } else if (wrapper.current.webkitRequestFullscreen) {
              wrapper.current.webkitRequestFullscreen();
            } else if (wrapper.current.msRequestFullscreen) {
              wrapper.current.msRequestFullscreen();
            }
          }
        }}
      >
        <Expand size="medium" color="white" style={{opacity: 0.4}}></Expand>
      </button>
    </div>
  );
};
