# MomentLive

MomentLive is a self hosted live streaming platform providing glass to glass latency as low as 4-5 seconds.

**Features**

 - built with easy self-hosting in mind, can run as a single dockerized service with no external dependencies.
 - leverages ffmpeg's powerful transcoding engine for video processing.
 - leverages open source lldash standard to provide stream latency of ~4-5 seconds purely over HTTP.
 - includes simple no-frills UI written in simple HTML5
    - UI leverages dash.js as video player, can be easily be embedded into your own application
    - Simple realtime chat

<img src="./docs/images/hs-latency.jpg" width="400px"/>

## Default OBS Configuration
By default the RTMP server running through ffmpeg is configured to listen with the following configuration:
```
port: 1935
stream: rtmp://0.0.0.0:1935/live
stream key: default 
```

<img src="./docs/images/obs-config.png" width="400px"/>

## Deploying With Docker
Example with `docker run`
```sh
docker run -p 5000:5000 -p 1935:1935 lastpenguin/harmony-live-stream
```

Example docker-compose.yml
```yaml
...
  momentlive:
    image: lastpenguin/momentlive
    container_name: momentlive
    restart: always
    ports:
      - 5000:5000 # web server
      - 1935:1935 # rtmp ingest
    volumes:
      - "./momentlive:/data" # configs etc stored here 
      - "<transcode tmp>:/tmp/momentlive" # temporary transcode fragments stored here
```

## Example Configs

### Mirror Config
*NOTE: this configuration is under development, no longer currently supported*

Configure a node to act as a mirror, this can be used to implement load balancing across a cluster of servers with one node acting as a primary and the rest acting as replicas.
```
{
  "mirrorOptions": {
    "url": "http(s)://<origin server ip addr>:5000/"
  },
  "tmpDir": "/tmp/unused",
  "rtmpIngestAddress": "rtmp://0.0.0.0:1935/live/default",
  "webServerPort": 5080
}
```

### Transcoding Config

Encodes video at 4 megabits per second 30 fps with the ffmpeg 'fast' preset. At least a quad core CPU and 2 GB of ram recommended for 1080p video

```json
{
  "streamOptions": {
    "name": "default",
    "codec": "h264",
    "h264opts": {
      "bitrate": 4000,
      "fps": 30,
      "preset": "fast"
    },
    "audioBitrate": 128,
    "segmentDuration": 10
  },
  "mirrorOptions": null,
  "tmpDir": "/tmp/harmonystream",
  "rtmpIngestAddress": "rtmp://0.0.0.0:1935/live/default",
  "webServerPort": 5000
}
```

## Reverse Proxy Support

Note: when using with a reverse proxy disable gzip / response compression. This can affect the size of the chunks used when buffering responses and can increase video latency / cause unexpected buffering.

