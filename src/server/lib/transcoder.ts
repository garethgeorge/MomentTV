import { timeStamp } from "console";
import { EventEmitter } from "eventemitter3";
import { spawn, ChildProcess } from "child_process";

const TAG = "[HarmonyStream][transcoder]";

export interface StreamOptions {
  name: string;
  codec: "h264" | "copy";
  h264opts?: {
    fps: number; // fps
    bitrate: number; // video bitrate kbit/sec
    preset: string; // ffmpeg preset
  };
  audioBitrate: number; // audio bitrate kbit/sec
  segmentDuration: number; // segment duration seconds
}

export default class Transcoder extends EventEmitter {
  private ffmpegProc: ChildProcess | null;
  private rtmpAddress: string;
  private options: StreamOptions;
  private uploadUrlBase: string;

  constructor(
    rtmpAddress: string,
    options: StreamOptions,
    uploadUrlBase: string
  ) {
    super();
    this.ffmpegProc = null;
    this.rtmpAddress = rtmpAddress;
    this.options = options;
    this.uploadUrlBase = uploadUrlBase;
  }

  async listenAndEncode() {
    let videoEncodeOptions: string[];
    if (this.options.codec === "copy") {
      videoEncodeOptions = ["-c:v", "copy"];
    } else if (this.options.codec === "h264") {
      const keyFrameInterval = this.options.segmentDuration * this.options.h264opts.fps;
      // prettier-ignore
      videoEncodeOptions = [
        "-c:v", "h264",
        "-r", "" + this.options.h264opts.fps,
        "-g", '' + keyFrameInterval,
        "-keyint_min", '' + keyFrameInterval,
        "-b:v", this.options.h264opts.bitrate + "k",
        "-bf", "0", "-refs", "3", "-sc_threshold", "0",
        "-profile:v", "high",
        "-preset", this.options.h264opts.preset,
        "-b_strategy", "0", "-sc_threshold", "0", "-pix_fmt", "yuv420p",
      ];
    } else {
      throw new Error(
        "invalid codec specified: " + this.options.codec + " for stream: " + this.options.name
      );
    }

    // prettier-ignore
    const dashOptions = [
      "-map", "0:v:0", "-map", "0:a:0",
      "-use_template", "1", 
      "-use_timeline", "0", 
      "-adaptation_sets", "id=0,streams=v id=1,streams=a",
      "-seg_duration", '' + this.options.segmentDuration,
      "-window_size", '' + this.options.segmentDuration,
      "-extra_window_size", '' + (this.options.segmentDuration * 2),
      "-remove_at_exit", "1", "-streaming", "1",
      "-ldash", "1",
      "-f", "dash",
      this.uploadUrlBase + "/" + this.options.name + ".mpd"
    ];

    return new Promise((accept, reject) => {
      // prettier-ignore
      const args: string[] = [
        "-f", "flv", "-listen", "1", "-i", this.rtmpAddress,
        videoEncodeOptions,
        "-c:a", "aac", "-b:a", this.options.audioBitrate + "k",
        dashOptions,
      ].flat();

      this.ffmpegProc = spawn("ffmpeg", args);
      this.ffmpegProc.stdout.pipe(process.stdout);
      this.ffmpegProc.stderr.pipe(process.stdout);
      this.ffmpegProc.on("close", (code) => {
        accept(code);
      });
    });
  }
}
