import { StreamOptions } from "./lib/transcoder";
import fs from "fs";
import crypto from "crypto";
import argparse from "argparse";
import { version } from "../../package.json";

const TAG = "[HarmonyStream][config]";

/*
  config file structure
*/

interface Moderator {
  isAdmin: boolean;
  username: string;
  password: string;
};

interface Config {
  version: string;
  uploadSecret?: string;
  streamOptions?: StreamOptions;
  mirrorOptions?: {
    url: string;
  },
  redis?: {
    host: string,
    port: number
  },
  tmpDir: string;
  rtmpIngestAddress?: string;
  webServerPort: number;
  moderators: Moderator[];
}

const defaultConfig: Config = {
  version: "v1.0",
  streamOptions: {
    name: "default",
    codec: "copy",
    /*
    codec: "h264",
    h264opts: {
      bitrate: 2000,
      fps: 30,
      preset: "fast",
    },
    */
    audioBitrate: 128,
    segmentDuration: 10,
  },
  mirrorOptions: null,
  // location to store temporary fragments of the generated video
  tmpDir: "/tmp/momentlive",
  // the address that the RTMP server listens on for the stream to be uploaded
  // see ffmpeg docs for valid URLs
  rtmpIngestAddress: "rtmp://0.0.0.0:1935/live/default",
  // port that the web server listens on
  webServerPort: 5000,
  moderators: [
    {
      isAdmin: true,
      username: "admin",
      password: crypto.randomBytes(4).toString("hex"),
    }
  ],
};

/*
  parse arguments from the CLI
*/
const parser = new argparse.ArgumentParser({
  description: "HarmonyLiveStream server",
});
parser.add_argument("-v", "--version", { action: "version", version });
parser.add_argument("--config", {
  help: "the path to the config file",
  default: "./config.json",
});
parser.add_argument("--port", {
  help: "the port for the web server to listen on",
});
const args = parser.parse_args();

/*
  load or create config file
*/
let config: Config = defaultConfig;

if (!fs.existsSync(args.config)) {
  console.log(
    TAG + " config not found at path " + args.config + ", generating new config from defaults"
  );
  try {
    fs.writeFileSync(args.config, JSON.stringify(config, null, 2));
  } catch (e) {
    console.log(TAG + " WARNING: unable to write default config to path " + args.config);
  }
} else {
  try {
    config = JSON.parse(fs.readFileSync(args.config).toString("utf8"));
  } catch (e) {
    console.log(TAG + " fatal error attempting to load configuration");
    throw e;
  }
}

/*
  apply command line overrides
*/
if (args.port) {
  config.webServerPort = parseInt(args.port);
  console.log(TAG + " command line override PORT = " + args.port);
}

if (!config.uploadSecret) {
  config.uploadSecret = crypto.randomBytes(8).toString("hex");
}

/*
  validate the config 
*/
config.tmpDir = config.tmpDir.replace(/\/$/, ""); 
if (config.mirrorOptions) {
  config.mirrorOptions.url = config.mirrorOptions.url.replace(/\/$/, "");
}

// TODO: additional validation

export default config;
