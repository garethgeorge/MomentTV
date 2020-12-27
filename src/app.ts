import express from "express";
import http from "http";
import morgan from "morgan";
import argparse from "argparse";
import { version } from "../package.json";
import fs from "fs";
import util from "util";
import mkdirp from "mkdirp";
import path from "path";
import Transcoder from "./lib/transcoder";
import StreamCache from "./lib/stream_cache";
import crypto from "crypto";
import SocketIO from "socket.io";

const TAG = "[HarmonyStream][main]";
const exists = util.promisify(fs.exists);
const stat = util.promisify(fs.stat);

const parser = new argparse.ArgumentParser({
  description: "HarmonyLiveStream server",
});

parser.add_argument("-v", "--version", { action: "version", version });
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
parser.add_argument("--tmpDir", {
  help: "the h264 preset to use for encoding",
  default: "/tmp/harmonystream",
});
parser.add_argument("--httpSecret", {
  help:
    "secret value to require for uploading chunks, passed as 'SECRET' header.",
  default: "",
});

/*
  process the arguments
*/
const app = express();
const server = http.createServer(app);
const io = new SocketIO.Server(server);

const args = parser.parse_args();
if (args.secret === "") {
  args.secret = crypto.randomBytes(8).toString("hex");
}

const tmpDir = args.tmpDir.replace(/\/$/, "");
app.set("trust proxy", true);
app.use(morgan("common"));

const memCache: { [path: string]: StreamCache } = {};

app.post("/live/*", async (req, res) => {
  if (req.headers["secret"] !== args.secret) {
    res.status(503 /* FORBIDDEN */);
    res.end("Forbidden, not on IP whitelist");
    return;
  }

  const reqPath = req.originalUrl;
  const streamCache = new StreamCache(req);
  memCache[reqPath] = streamCache;

  const dirName = tmpDir + path.dirname(reqPath);

  req.on("close", async () => {
    await mkdirp(dirName);
    streamCache.pipe(fs.createWriteStream(tmpDir + reqPath));

    res.end();
    setTimeout(() => {
      delete memCache[reqPath];
    }, 1000);
  });
});

app.delete("/live/*", async (req, res) => {
  if (req.headers["secret"] !== args.secret) {
    res.status(503 /* FORBIDDEN */);
    res.end("Forbidden, not on IP whitelist");
    return;
  }

  if (await exists(tmpDir + req.originalUrl)) {
    res.status(404);
    res.end("404 Not Found");
    return;
  }
  
  fs.unlink(tmpDir + req.originalUrl, () => {
    console.log(TAG + " unlinked " + tmpDir + req.originalUrl);
  });
  res.status(204 /* NO_CONTENT */);
  res.end();
});

app.get("/live/*", async (req, res) => {
  const reqPath = req.originalUrl;
  const cachedChunk = memCache[reqPath];
  if (cachedChunk) {
    res.status(200);
    cachedChunk.pipe(res);
  } else if ((await exists(tmpDir + reqPath)) && (await stat(tmpDir + reqPath)).isFile()) {
    res.status(200);
    fs.createReadStream(tmpDir + reqPath).pipe(res);
  } else {
    res.status(404);
    res.end("404 Not Found");
  }
});

app.use(express.static("./public"));

let connectedClients = 0;
const broadcastNumUsers = () => {
  io.emit("message", "[system]", connectedClients + " users connected");
}

io.on("connection", (socket: SocketIO.Socket) => {
  connectedClients++;
  socket.on("message", (username, message) => {
    io.emit("message", username, message);
  });

  socket.on("disconnect", () => {
    connectedClients--;
    broadcastNumUsers();
  });

  broadcastNumUsers();
});

/*
  start listening & launch transcoder service
*/
server.listen(args.webPort, async () => {
  console.log(TAG + " listening on " + args.webPort);
  console.log(TAG + " starting transcoder loop");

  const transcoder = new Transcoder(
    args.rtmpHost,
    "http://localhost:" + args.webPort + "/live/app/manifest.mpd",
    args.secret,
    {
      bitrate: args.videoBitrate as string,
      audioBitrate: args.audioBitrate as string,
      preset: args.h264preset,
    }
  );

  while (true) {
    console.log(TAG + " starting transcoder listening.");
    await transcoder.listenAndEncode();
    console.log(TAG + " transcoder died, restart in 5 seconds.");
    await new Promise((accept) => {
      setTimeout(accept, 5000);
    });
  }
});
