export abstract class UiAnimation {
  protected readonly defaultAnimationTime = 150;
  protected disposed = false;
  private readonly pendingTimers = new Map<ReturnType<typeof setTimeout>, () => void>();

  protected play(time: number, action?: () => void): Promise<void> {
    if (this.disposed) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingTimers.delete(timer);
        try {
          if (!this.disposed) {
            action && action();
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      }, time);
      this.pendingTimers.set(timer, resolve);
    });
  }

  public dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const [timer, resolve] of this.pendingTimers) {
      clearTimeout(timer);
      resolve();
    }
    this.pendingTimers.clear();
  }

  public static async play(time: number, action?: () => void) {
    return new Promise<void>(r => {
      setTimeout(() => {
        action && action();
        r();
      }, time);
    });
  }
}
