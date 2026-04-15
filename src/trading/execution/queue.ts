export class AsyncSignalQueue<T> {
  private readonly items: T[] = [];
  private processing = false;

  constructor(private readonly worker: (item: T) => Promise<void>) {}

  enqueue(item: T) {
    this.items.push(item);
    void this.drain();
  }

  size() {
    return this.items.length;
  }

  private async drain() {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (this.items.length > 0) {
        const next = this.items.shift();
        if (typeof next === 'undefined') {
          continue;
        }

        await this.worker(next);
      }
    } finally {
      this.processing = false;
    }
  }
}
