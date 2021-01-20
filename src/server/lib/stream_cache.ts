import stream from "stream";

export default class StreamCache {
  private buffers: Buffer[];
  private destinations: stream.Writable[] | null;
  private ended: boolean;
  constructor(stream: stream.Readable, flushIntervalMs: number = 100) {
    this.buffers = [];
    this.destinations = [];
    this.ended = false;

    /*
      interval flushing logic, this reduces the number of chunks 
      generated. This reduces overhead and improves performance/reliability
    */
    let buffer = [];
    const flush = () => {
      if (buffer.length === 0) return;
      const data = Buffer.concat(buffer);
      for (const dest of this.destinations) {
        dest.write(data);
      }
      this.buffers.push(data);
      buffer = [];
    };

    stream.on("data", (data) => {
      buffer.push(data);
    });

    const flushInterval = setInterval(flush, flushIntervalMs);

    stream.on("end", () => {
      this.ended = true;
      clearInterval(flushInterval);
      flush();
      for (const dest of this.destinations) {
        dest.end();
      }
      this.destinations = null;
    });
  }

  pipe(stream: stream.Writable) {
    // catch up by writing the existing buffers, they should hopefully be small enough to bufer in memory
    for (const buffer of this.buffers) {
      stream.write(buffer);
    }
    if (this.ended) {
      stream.end();
    } else this.destinations.push(stream);
  }

  data(): Buffer {
    return Buffer.concat(this.buffers);
  }
}
