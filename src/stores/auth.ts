import { create } from 'zustand';

import { withSessionCommitLock } from './session-commit';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  sessionVersion: number;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  setTokensForLogin: (
    version: number,
    tokens: AuthTokens,
    signal?: AbortSignal,
  ) => Promise<boolean>;
  clearTokens: () => Promise<void>;
  syncSession: () => void;
  getSharedSessionId: () => string | null;
  clearTokensForSession: (version: number, expectedRefreshToken: string | null) => boolean;
  updateTokensForSession: (
    version: number,
    expectedRefreshToken: string,
    tokens: AuthTokens,
  ) => boolean;
}

interface StoredSession {
  id: string | null;
  tokens: AuthTokens | null;
}

const activeSessionKey = 'workbase-auth-session';
const legacyTokensKey = 'workbase-auth';
const sessionTokensPrefix = `${legacyTokensKey}:`;
const legacySessionId = 'legacy';
const emptySession: StoredSession = { id: null, tokens: null };
const emptyTokens = { accessToken: null, refreshToken: null };

function isSameSession(first: StoredSession, second: StoredSession): boolean {
  return first.id === second.id && (first.tokens === null) === (second.tokens === null);
}

function hasAuthTokens(value: unknown): value is AuthTokens {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accessToken' in value &&
    typeof value.accessToken === 'string' &&
    value.accessToken.trim() !== '' &&
    'refreshToken' in value &&
    typeof value.refreshToken === 'string' &&
    value.refreshToken.trim() !== ''
  );
}

export function parseAuthTokens(data: unknown): AuthTokens {
  if (!hasAuthTokens(data)) {
    throw new Error('认证响应缺少有效令牌');
  }

  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

function readJson(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function tokenPair(value: unknown): AuthTokens | null {
  return hasAuthTokens(value)
    ? { accessToken: value.accessToken, refreshToken: value.refreshToken }
    : null;
}

function readSessionTokens(storage: Storage, id: string | null): StoredSession {
  if (id === '') return emptySession;
  if (id !== null) {
    return { id, tokens: tokenPair(readJson(storage.getItem(`${sessionTokensPrefix}${id}`))) };
  }

  const legacy = readJson(storage.getItem(legacyTokensKey));
  const migrated = storage.getItem(`${sessionTokensPrefix}${legacySessionId}`);
  if (migrated !== null) return { id: legacySessionId, tokens: tokenPair(readJson(migrated)) };

  const tokens =
    typeof legacy === 'object' && legacy !== null && 'state' in legacy
      ? tokenPair(legacy.state)
      : null;
  return tokens === null ? emptySession : { id: legacySessionId, tokens };
}

function readStoredSession(storage: Storage): StoredSession {
  let id = storage.getItem(activeSessionKey);
  while (true) {
    const session = readSessionTokens(storage, id);
    const activeId = storage.getItem(activeSessionKey);
    if (activeId === id) return session;
    id = activeId;
  }
}

function getLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function createSessionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export const useAuthStore = create<AuthState>()((set, get) => {
  let storage = getLocalStorage();

  function withStorage<T>(operation: (localStorage: Storage) => T): T | undefined {
    if (storage === undefined) return undefined;
    try {
      return operation(storage);
    } catch {
      storage = undefined;
      return undefined;
    }
  }

  let session = withStorage(readStoredSession) ?? emptySession;

  function applySession(next: StoredSession, forceVersionChange = false): void {
    const state = get();
    const tokens = next.tokens ?? emptyTokens;
    const changed = forceVersionChange || !isSameSession(next, session);
    session = next;
    if (
      changed ||
      tokens.accessToken !== state.accessToken ||
      tokens.refreshToken !== state.refreshToken
    ) {
      set({ ...tokens, sessionVersion: state.sessionVersion + (changed ? 1 : 0) });
    }
  }

  function syncSession(): void {
    const stored = withStorage(readStoredSession);
    if (stored !== undefined) applySession(stored);
  }

  async function replaceSession(
    tokens: AuthTokens | null,
    expectedVersion?: number,
    signal?: AbortSignal,
  ): Promise<boolean> {
    // Keep a new generation even when logout leaves no token record.
    const id = createSessionId();
    const next = {
      id,
      tokens:
        tokens === null
          ? null
          : { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
    };

    function commit(): boolean {
      if (signal?.aborted === true) return false;
      if (expectedVersion !== undefined && get().sessionVersion !== expectedVersion) return false;

      return (
        withStorage((localStorage) => {
          const previous = readStoredSession(localStorage);
          if (expectedVersion !== undefined && !isSameSession(previous, session)) return false;

          const nextRecord = next.tokens === null ? null : `${sessionTokensPrefix}${id}`;
          if (nextRecord !== null) localStorage.setItem(nextRecord, JSON.stringify(next.tokens));

          if (
            expectedVersion !== undefined &&
            !isSameSession(readStoredSession(localStorage), previous)
          ) {
            if (nextRecord !== null) localStorage.removeItem(nextRecord);
            return false;
          }

          localStorage.setItem(activeSessionKey, id);
          if (previous.id !== null) localStorage.removeItem(`${sessionTokensPrefix}${previous.id}`);
          localStorage.removeItem(legacyTokensKey);
          return true;
        }) ?? true
      );
    }

    const outcome = storage === undefined ? commit() : withSessionCommitLock(commit);
    const committed = typeof outcome === 'boolean' ? outcome : await outcome;
    const active = withStorage(readStoredSession) ?? (committed ? next : session);
    const replaced = committed && isSameSession(active, next);
    applySession(active, replaced);
    return replaced;
  }

  function updateSession(
    version: number,
    expectedRefreshToken: string | null,
    tokens: AuthTokens | null,
  ): boolean {
    syncSession();
    const state = get();
    if (state.sessionVersion !== version || state.refreshToken !== expectedRefreshToken)
      return false;

    const { id } = session;
    if (id === null) {
      applySession(emptySession, true);
      return tokens === null;
    }

    const next = { id, tokens };
    const stored = withStorage((localStorage) => {
      // Refresh outcomes write only their own generation, even if another tab changes the active pointer.
      const key = `${sessionTokensPrefix}${id}`;
      if (tokens === null && id !== legacySessionId) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(tokens));
      if (id === legacySessionId) localStorage.removeItem(legacyTokensKey);

      const active = readStoredSession(localStorage);
      if (active.id !== id) localStorage.removeItem(key);
      return active;
    });
    const active = stored ?? next;
    applySession(active, tokens === null && active.id === id && active.tokens === null);
    return (
      active.id === id &&
      active.tokens?.accessToken === tokens?.accessToken &&
      active.tokens?.refreshToken === tokens?.refreshToken
    );
  }

  return {
    ...(session.tokens ?? emptyTokens),
    sessionVersion: 0,
    setTokens: async (tokens) => {
      await replaceSession(tokens);
    },
    setTokensForLogin: (version, tokens, signal) => replaceSession(tokens, version, signal),
    clearTokens: async () => {
      await replaceSession(null);
    },
    syncSession,
    getSharedSessionId: () => (storage === undefined ? null : session.id),
    clearTokensForSession: (version, expectedRefreshToken) =>
      updateSession(version, expectedRefreshToken, null),
    updateTokensForSession: updateSession,
  };
});

export function watchAuthSession(): () => void {
  function sync(event: StorageEvent): void {
    if (event.storageArea !== getLocalStorage()) return;
    const { key } = event;
    if (
      key !== null &&
      key !== activeSessionKey &&
      key !== legacyTokensKey &&
      !key.startsWith(sessionTokensPrefix)
    )
      return;

    useAuthStore.getState().syncSession();
  }

  window.addEventListener('storage', sync);
  return () => window.removeEventListener('storage', sync);
}
