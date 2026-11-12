type HttpNotificationLevel = 'error' | 'warning' | 'success';
type HttpNotifier = (message: string, level: HttpNotificationLevel) => void;

let httpNotifier: HttpNotifier | undefined;

export function registerHttpNotifier(notifier: HttpNotifier): () => void {
  httpNotifier = notifier;

  return () => {
    if (httpNotifier === notifier) {
      httpNotifier = undefined;
    }
  };
}

export function notifyHttpError(message: string): void {
  httpNotifier?.(message, 'error');
}

export function notifyHttpWarning(message: string): void {
  httpNotifier?.(message, 'warning');
}

export function notifyHttpSuccess(message: string): void {
  httpNotifier?.(message, 'success');
}
