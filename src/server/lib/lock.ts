export default class AsyncLock {
  private numBlocked: number = 0;
  private queue: (() => Promise<void>) | null = null;

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    const numBlockedOnEntry = this.numBlocked;
    this.numBlocked++;

    return new Promise((accept, reject) => {
      if (this.queue === null) {
        this.queue = async () => {
          try {
            accept(await fn())
          } catch (e) {
            reject(e);
          } finally {
            this.numBlocked--;
          }
          if (this.queue !== null) {
            this.queue();
            this.queue = null;
          }
        };
      } else {
        const firstInLine = this.queue;
        this.queue = async () => {
          await firstInLine();
          try {
            accept(await fn())
          } catch (e) {
            reject(e);
          } finally {
            this.numBlocked--;
          }
        };
      }

      if (numBlockedOnEntry === 0) {
        this.queue();
        this.queue = null;
      }
    });
  }
}
