const lockName = 'workbase-auth-session-commit';
const lockStore = 'session-commit';

function withIndexedDbLock(commit: () => boolean): Promise<boolean> | boolean {
  let open: IDBOpenDBRequest | undefined;
  try {
    open = globalThis.indexedDB?.open(lockName, 1);
  } catch {
    return commit();
  }
  if (open === undefined) return commit();

  const request = open;
  let started = false;
  return new Promise<boolean>((resolve, reject) => {
    request.onupgradeneeded = () => {
      request.result.createObjectStore(lockStore);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      try {
        // A read request runs only when this readwrite transaction owns the store.
        const transaction = database.transaction(lockStore, 'readwrite');
        const ready = transaction.objectStore(lockStore).get(lockName);
        let committed = false;
        transaction.oncomplete = () => resolve(committed);
        transaction.onabort = () => {
          if (started) resolve(committed);
          else reject(transaction.error);
        };
        ready.onsuccess = () => {
          started = true;
          try {
            committed = commit();
          } catch (error) {
            reject(error);
          }
        };
      } catch (error) {
        reject(error);
      } finally {
        database.close();
      }
    };
  }).catch((error: unknown) => {
    if (started) throw error;
    return commit();
  });
}

export function withSessionCommitLock(commit: () => boolean): Promise<boolean> | boolean {
  const locks = globalThis.navigator?.locks;
  if (locks === undefined) return withIndexedDbLock(commit);

  let started = false;
  return locks
    .request(lockName, () => {
      started = true;
      return commit();
    })
    .catch((error: unknown) => {
      if (started || !(error instanceof DOMException) || error.name !== 'SecurityError')
        throw error;
      return withIndexedDbLock(commit);
    });
}
