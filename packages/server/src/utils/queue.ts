/**
 * SerialQueue — async serial task runner.
 *
 * Why: multer writes files to disk asynchronously. If two large uploads land
 * at the same time we don’t want them racing over the same tmp path or
 * hammering the disk in parallel. SerialQueue drains one task at a time,
 * keeping disk I/O predictable without blocking the event loop.
 *
 * Usage:
 *   const queue = new SerialQueue();
 *   const result = await queue.push(() => someAsyncWork());
 */
export class SerialQueue {
  private running = false;
  private readonly tasks: Array<() => void> = [];

  push<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.tasks.push(async () => {
        try {
          resolve(await task());
        } catch (err) {
          reject(err);
        } finally {
          this.running = false;
          this.drain();
        }
      });
      this.drain();
    });
  }

  private drain(): void {
    if (this.running || this.tasks.length === 0) return;
    this.running = true;
    const next = this.tasks.shift()!;
    next();
  }
}

// Singleton used by the uploads route.
export const uploadQueue = new SerialQueue();
