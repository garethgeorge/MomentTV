import express from "express";
import morgan from "morgan";
import argparse from "argparse";
import {version} from "../package.json";
import fs from "fs";
import util from "util";
import mkdirp from "mkdirp";
import path from "path";
import Transcoder from "./lib/transcoder";
import StreamCache from "./lib/stream_cache";

const TAG = "[HarmonyStream][main]";
const exists = util.promisify(fs.exists);
const stat = util.promisify(fs.stat);

const parser = new argparse.ArgumentParser({
  description: 'HarmonyLiveStream server'
});

parser.add_argument('-v', '--version', { action: 'version', version });
parser.add_argument("--rtmpHost", {
  help: "the listening address of the RTMP ingress service",
  default: "rtmp://0.0.0.0:1935/live/default",
});
parser.add_argument("--webPort", {
  help: "the port that the web service will listen on",
  default: "5000",
});
parser.add_argument("--videoBitrate", {
  help: "the bitrate the video will be encoded at",
  default: "4000k",
});
parser.add_argument("--audioBitrate", {
  help: "the bitrate the video will be encoded at",
  default: "128k",
});
parser.add_argument("--h264preset", {
  help: "the h264 preset to use for encoding",
  default: "fast",
});
/*
parser.add_argument("--mirror", {
  help: "the upstream node to mirror rather than producing our own transcoded stream",
  default: false,
  action: "store_true",
});
*/

const args = parser.parse_args();
const app = express();
app.use(morgan("common"));

const memCache: {[path: string]: StreamCache} = {};

app.post("/live/*", async (req, res) => {
  const reqPath = req.originalUrl;
  const streamCache = new StreamCache(req);
  memCache[reqPath] = streamCache;
  
  const dirName = "./tmp" + path.dirname(reqPath);

  req.on("close", async () => {
    await mkdirp(dirName);
    streamCache.pipe(fs.createWriteStream("./tmp" + reqPath))
    
    res.end();
    setTimeout(() => {
      delete memCache[reqPath];
    }, 1000);
  });
});

app.delete("/live/*", async (req, res) => {
  fs.unlink("./tmp" + req.originalUrl, () => {
    console.log(TAG + " unlinked ./tmp" + req.originalUrl);
  });
  res.end();
});

app.get("/live/*", async (req, res) => {
  const reqPath = req.originalUrl;
  if (memCache[reqPath]) {
    res.status(200);
    memCache[reqPath].pipe(res);
  } else if (await exists("./tmp" + reqPath) && (await stat("./tmp" + reqPath)).isFile()) {
    res.status(200);
    fs.createReadStream("./tmp" + reqPath).pipe(res);
  } else {
    res.status(404);
    res.end("404 Not Found");
  }
});

app.use(express.static(path.join(__dirname, "../public")));

/*
  start listening & launch transcoder service
*/
app.listen(args.webPort, async () => {
  console.log(TAG + " listening on " + args.webPort);
  console.log(TAG + " starting transcoder loop");

  const transcoder = new Transcoder(args.rtmpHost, "http://" + args.webPort + "/live/app/manifest.mpd", {
    bitrate: args.videoBitrate as string,
    audioBitrate: args.audioBitrate as string,
    preset: args.h264preset,
  });

  while (true) {
    console.log(TAG + " starting transcoder listening.");
    await transcoder.listenAndEncode();
    console.log(TAG + " transcoder died, restart in 5 seconds.");
    await new Promise((accept) => {
      setTimeout(accept, 5000);
    });
  }
});