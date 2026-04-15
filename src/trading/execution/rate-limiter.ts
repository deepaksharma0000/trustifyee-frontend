export class OrderRateLimiter {
  private readonly timestamps: number[] = [];

  constructor(
    private readonly maxOrdersPerWindow: number,
    private readonly windowMs: number
  ) {}

  async waitForTurn(): Promise<void> {
    while (true) {
      const now = Date.now();

      while (this.timestamps.length > 0 && now - this.timestamps[0] >= this.windowMs) {
        this.timestamps.shift();
      }

      if (this.timestamps.length < this.maxOrdersPerWindow) {
        this.timestamps.push(now);
        return;
      }

      const oldest = this.timestamps[0];
      const waitMs = Math.max(this.windowMs - (now - oldest), 25);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}
