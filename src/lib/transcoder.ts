import { timeStamp } from "console";
import {EventEmitter} from "eventemitter3";
import {spawn, ChildProcess} from "child_process";

export interface TranscoderOptions {
  bitrate: string,
  audioBitrate: string,
  preset: string,
}

export default class Transcoder extends EventEmitter {
  private ffmpegProc: ChildProcess | null;
  private rtmpAddress: string;
  private transcoderOptions: TranscoderOptions;
  private manifestUrl: string;
  
  constructor(rtmpAddress: string, manifestUrl: string, transcoderOptions: TranscoderOptions = {
    "bitrate": "4000k",
    "audioBitrate": "128k",
    "preset": "fast",
  }) {
    super();
    this.transcoderOptions = transcoderOptions;
    this.rtmpAddress = rtmpAddress;
    this.ffmpegProc = null;
    this.manifestUrl = manifestUrl;
  }

  async listenAndEncode() {
    return new Promise((accept, reject) => {
      this.ffmpegProc = spawn("ffmpeg", [
        "-f", "flv", "-listen", "1", "-i", this.rtmpAddress,
        "-c:v", "libx264", 
        "-profile:v", "high", "-preset", this.transcoderOptions.preset, "-bf", "0", "-refs", "3", "-sc_threshold", "0",
        "-b:v", this.transcoderOptions.bitrate,
        "-g", "150",
        "-keyint_min", "150",
        "-preset", this.transcoderOptions.preset,
        "-c:a", "aac", "-b:a", this.transcoderOptions.audioBitrate,
        "-b_strategy", "0", "-sc_threshold", "0", "-pix_fmt", "yuv420p",
        "-map", "0:v:0", "-map", "0:a:0",
        "-use_template", "1", 
        "-use_timeline", "0", 
        "-adaptation_sets", "id=0,streams=v id=1,streams=a",
        "-seg_duration", "10",
        "-window_size", "10",
        "-extra_window_size", "20",
        "-remove_at_exit", "1", "-streaming", "1",
        "-ldash", "1",
        "-f", "dash", this.manifestUrl,
      ]);

      this.ffmpegProc.stdout.pipe(process.stdout);
      this.ffmpegProc.stderr.pipe(process.stdout);
      
      this.ffmpegProc.on("close", (code) => {
        accept(code);
      });
    });
  }
}