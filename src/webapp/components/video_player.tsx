import React, { useState, useRef } from "react";
import dashjs from "dashjs";

export default () => {
  const [playing, setPlaying] = useState(false);
  let videoDom;

  return (
    <div>
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
    </div>
  );
};
