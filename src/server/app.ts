import express from "express";
import http from "http";
import morgan from "morgan";
import fs from "fs";
import util from "util";
import mkdirp from "mkdirp";
import path from "path";
import Transcoder from "./lib/transcoder";
import StreamCache from "./lib/stream_cache";
import SocketIO from "socket.io";
import config from "./config";
import AsyncLock from "./lib/lock";
import axios, { AxiosResponse } from "axios";

const TAG = "[HarmonyStream][main]";
const exists = util.promisify(fs.exists);

/*
  process the arguments
*/
const app = express();
const server = http.createServer(app);
const io = new SocketIO.Server(server);
if (config.mirrorOptions) {
  console.log(TAG + " mirror is currently under development.");
  process.exit(1);
}


const tmpDir = config.tmpDir;
app.set("trust proxy", true);
app.use(morgan("common"));

// cache chunks that are currently being uploaded in memory
const memCache: { [path: string]: StreamCache } = {};
// list of files created by the app, deleted when the stream ends
let createdFiles: { [path: string]: boolean } = {}; 

app.post("/upload/:secret/*", async (req, res) => {
  const reqPath = "/" + req.params["0"];

  if (req.params["secret"] !== config.uploadSecret) {
    console.log(req.params["secret"], " but expected ", config.uploadSecret);
    res.status(503 /* FORBIDDEN */);
    res.end("Forbidden, not on IP whitelist");
    return;
  }

  const streamCache = new StreamCache(req);
  memCache[reqPath] = streamCache;

  const dirName = tmpDir + path.dirname(reqPath);
  console.log("storing file at " + dirName);

  req.on("close", async () => {
    await mkdirp(dirName);
    const writeStream = fs.createWriteStream(tmpDir + reqPath);
    createdFiles[tmpDir + reqPath] = true;
    streamCache.pipe(writeStream);
    writeStream.on("finish", () => {
      res.end();
      setTimeout(() => {
        delete memCache[reqPath];
      }, 1000);
    });
  });
});

app.delete("/upload/:secret/*", async (req, res) => {
  const reqPath = "/" + req.params["0"];

  if (req.params["secret"] !== config.uploadSecret) {
    res.status(503 /* FORBIDDEN */);
    res.end("Forbidden, not on IP whitelist");
    return;
  }

  if (await exists(tmpDir + reqPath)) {
    res.status(404);
    res.end("404 Not Found");
    return;
  }

  fs.unlink(tmpDir + reqPath, () => {
    console.log(TAG + " unlinked " + tmpDir + reqPath);
  });
  res.status(204 /* NO_CONTENT */);
  res.end();
});

const mirrorLock = new AsyncLock();

app.get("/stream/*", async (req, res) => {
  const reqPath = "/" + req.params["0"];
  const cachedChunk = memCache[reqPath];
  if (cachedChunk) {
    res.status(200);
    cachedChunk.pipe(res);
  } else if (
    !config.mirrorOptions && createdFiles[tmpDir + reqPath]
  ) {
    res.status(200);
    fs.createReadStream(tmpDir + reqPath).pipe(res);
  } else {
    if (config.mirrorOptions) {
      // acquire a lock while we try the request to prevent races
      await mirrorLock.acquire(async () => {
        // check if the chunk was downloaded before we entered the critical section
        if (memCache[reqPath]) {
          memCache[reqPath].pipe(res);
          return;
        }

        // try to download from the primary node
        let resp;
        try {
          const time = new Date().getTime();
          resp = await axios.get(config.mirrorOptions.url + "/stream" + reqPath, {
            responseType: "stream",
          });
        } catch (e) {
          if (e.response) {
            resp = e.response as AxiosResponse<any>;
          } else throw e;
        }

        console.log(
          TAG + " attempted to fetch " + reqPath + " from mirror, status: " + resp.status
        );
        if (resp.status === 200) {
          // cache in memory
          memCache[reqPath] = new StreamCache(resp.data);
          setTimeout(() => {
            delete memCache[reqPath];
          }, 10000);
          memCache[reqPath].pipe(res);
        } else {
          res.status(resp.status);
          res.end(resp.statusText);
        }
      });
    }
  }
});

app.use(express.static("./public"));

/*
  handle socket io connections
*/
let connectedClients: number = 0;
const broadcastNumUsers = () => {
  io.emit("message", "[system]", connectedClients + " users connected");
};

io.on("connection", (socket: SocketIO.Socket) => {
  connectedClients++;
  
  socket.emit("streamInfo", {
    name: config.streamOptions.name,
  });
  
  socket.on("message", (username, message) => {
    if (username.length > 20 || username === "") {
      socket.emit("message", "[system]", "invalid username");
    }
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
const clearCreatedFiles = () => {
  // clear out the files from the last run
  const createdFileList = Object.keys(createdFiles);
  console.log(TAG + " unlinking " + createdFileList.length + " files from previous run.");
  for (const file of createdFileList) {
    try {
      fs.unlinkSync(file);
    } catch (e) {}
  }
  createdFiles = {};
}

server.listen(config.webServerPort, async () => {
  console.log(TAG + " listening on " + config.webServerPort);

  if (config.streamOptions) {
    console.log(TAG + " starting transcoder loop with secret: " + config.uploadSecret);

    const transcoder = new Transcoder(
      config.rtmpIngestAddress,
      config.streamOptions,
      "http://localhost:" + config.webServerPort + "/upload/" + config.uploadSecret + "/live"
    );
    
    while (true) {
      console.log(TAG + " starting transcoder listening on: " + config.rtmpIngestAddress);
      await transcoder.listenAndEncode();
      console.log(TAG + " transcoder died, restart in 5 seconds.");

      clearCreatedFiles();
      await new Promise((accept) => {
        setTimeout(accept, 5000);
      });
    }
  } else {
    console.log(TAG + " no stream configured, skipping starting transcoder");
  }

  if (config.mirrorOptions) {
    console.log(TAG + " configured to mirror " + config.mirrorOptions.url);
  }
});

process.on("beforeExit", () => {
  clearCreatedFiles();
});