import stream from "stream";

export default class StreamCache {
  private stream: stream.Stream;
  private buffers: Buffer[];
  private ended: boolean;
  constructor(stream: stream.Readable) {
    this.stream = stream;
    this.buffers = [];
    this.ended = false;
    stream.on("data", (data) => {
      this.buffers.push(data);
    });
    stream.on("end", () => {
      this.ended = true;
    });
  }

  pipe(stream: stream.Writable) {
    // catch up by writing the existing buffers, they should hopefully be small enough to bufer in memory
    for (const buffer of this.buffers) {
      stream.write(buffer);
    }
    if (this.ended) {
      stream.end();
    } else
      this.stream.pipe(stream);
  }

  data(): Buffer {
    return Buffer.concat(this.buffers);
  }
}