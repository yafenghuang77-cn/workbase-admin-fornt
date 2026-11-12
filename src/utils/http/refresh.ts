import type { AxiosError } from 'axios';
import { isAxiosError } from 'axios';

import type { AuthTokens } from '@/stores/auth';
import { useAuthStore } from '@/stores/auth';

import { isApiError } from './error';

export interface AuthSession {
  version: number;
  accessToken: string | null;
}

type RefreshTokens = (refreshToken: string) => Promise<AuthTokens>;
type RefreshResult = { accessToken: string } | { expired: boolean };

const refreshLockPrefix = 'workbase-auth-refresh:';
const refreshAttemptPrefix = 'workbase-auth-refresh-attempt:';
// Keep abandoned attempts bounded and allow the 15-second transport timeout to settle.
const refreshAttemptLifetime = 20_000;
const refreshAttemptPollInterval = 100;

let pendingRefresh: { version: number; promise: Promise<RefreshResult> } | undefined;
let expiryRegistration: { handler: () => void } | undefined;
const expiredErrors = new WeakSet<object>();

export function setSessionExpiredHandler(handler: () => void): () => void {
  const registration = { handler };
  expiryRegistration = registration;

  return () => {
    if (expiryRegistration === registration) expiryRegistration = undefined;
  };
}

export function isSessionExpiredError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && expiredErrors.has(error);
}

function synchronizedSession() {
  useAuthStore.getState().syncSession();
  return useAuthStore.getState();
}

function expireSession(version: number, refreshToken: string | null): boolean {
  const state = useAuthStore.getState();
  if (!state.clearTokensForSession(version, refreshToken)) return false;

  const active = synchronizedSession();
  if (active.sessionVersion !== version + 1 || active.accessToken !== null) return false;

  expiryRegistration?.handler();
  return true;
}

function rejectUnauthorized(originalError: AxiosError<unknown, unknown>, expired: boolean): never {
  if (expired) expiredErrors.add(originalError);

  throw originalError;
}

function hasOtherRefreshAttempt(storage: Storage, sessionPrefix: string): boolean {
  try {
    let pending = false;
    const now = Date.now();
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index);
      if (key === null || !key.startsWith(refreshAttemptPrefix)) continue;

      if (Number(storage.getItem(key)) > now) {
        if (key.startsWith(sessionPrefix)) pending = true;
      } else {
        storage.removeItem(key);
      }
    }
    return pending;
  } catch {
    return false;
  }
}

function trackRefreshAttempt(sessionId: string | null) {
  if (sessionId === null) return undefined;

  try {
    const storage = window.localStorage;
    const sessionPrefix = `${refreshAttemptPrefix}${sessionId}:`;
    const attemptId = crypto.getRandomValues(new Uint32Array(4)).join('-');
    const key = `${sessionPrefix}${attemptId}`;
    hasOtherRefreshAttempt(storage, sessionPrefix);
    storage.setItem(key, String(Date.now() + refreshAttemptLifetime));

    return {
      release() {
        try {
          storage.removeItem(key);
        } catch {
          // An unavailable store cannot coordinate further attempts.
        }
      },
      async waitForOthers(isCurrent: () => boolean) {
        const deadline = Date.now() + refreshAttemptLifetime;
        while (
          Date.now() < deadline &&
          isCurrent() &&
          hasOtherRefreshAttempt(storage, sessionPrefix)
        ) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, refreshAttemptPollInterval);
          });
        }
      },
    };
  } catch {
    return undefined;
  }
}

function isCurrentRefresh(
  state: ReturnType<typeof synchronizedSession>,
  session: AuthSession,
  refreshToken: string,
): boolean {
  return (
    state.sessionVersion === session.version &&
    state.accessToken === session.accessToken &&
    state.refreshToken === refreshToken
  );
}

function updatedSession(session: AuthSession, refreshToken: string): RefreshResult {
  const state = synchronizedSession();
  return state.sessionVersion === session.version &&
    !isCurrentRefresh(state, session, refreshToken) &&
    state.accessToken !== null
    ? { accessToken: state.accessToken }
    : { expired: false };
}

async function refreshSession(
  session: AuthSession,
  refreshToken: string,
  refreshTokens: RefreshTokens,
): Promise<RefreshResult> {
  const state = synchronizedSession();
  if (!isCurrentRefresh(state, session, refreshToken)) return updatedSession(session, refreshToken);
  const attempt = trackRefreshAttempt(state.getSharedSessionId());

  try {
    const tokens = await refreshTokens(refreshToken);
    const active = synchronizedSession();
    if (!isCurrentRefresh(active, session, refreshToken))
      return updatedSession(session, refreshToken);
    const updated = active.updateTokensForSession(session.version, refreshToken, tokens);
    return updated ? { accessToken: tokens.accessToken } : updatedSession(session, refreshToken);
  } catch (error) {
    const active = synchronizedSession();
    if (!isCurrentRefresh(active, session, refreshToken))
      return updatedSession(session, refreshToken);

    const status = isAxiosError(error) ? error.response?.status : undefined;
    if (isApiError(error) || status === 400 || status === 401 || status === 403) {
      if (attempt !== undefined) {
        // On browsers without Web Locks, another tab may already be rotating this token.
        attempt.release();
        await attempt.waitForOthers(() =>
          isCurrentRefresh(synchronizedSession(), session, refreshToken),
        );
      }
      if (!isCurrentRefresh(synchronizedSession(), session, refreshToken))
        return updatedSession(session, refreshToken);

      return expireSession(session.version, refreshToken)
        ? { expired: true }
        : updatedSession(session, refreshToken);
    }

    throw error;
  } finally {
    attempt?.release();
  }
}

async function coordinateRefresh(
  session: AuthSession,
  refreshToken: string,
  refreshTokens: RefreshTokens,
): Promise<RefreshResult> {
  const state = synchronizedSession();
  if (!isCurrentRefresh(state, session, refreshToken)) return updatedSession(session, refreshToken);

  const sessionId = state.getSharedSessionId();
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  if (sessionId === null || locks === undefined)
    return refreshSession(session, refreshToken, refreshTokens);

  let acquired = false;
  try {
    return await locks.request(`${refreshLockPrefix}${sessionId}`, () => {
      acquired = true;
      return refreshSession(session, refreshToken, refreshTokens);
    });
  } catch (error) {
    if (acquired || !(error instanceof DOMException) || error.name !== 'SecurityError') throw error;
    return refreshSession(session, refreshToken, refreshTokens);
  }
}

export async function handleUnauthorized(
  originalError: AxiosError<unknown, unknown>,
  session: AuthSession,
  refreshTokens: RefreshTokens,
): Promise<string> {
  const state = synchronizedSession();
  if (state.sessionVersion !== session.version) throw originalError;

  const { accessToken, refreshToken } = state;
  if (accessToken !== null && accessToken !== session.accessToken) return accessToken;
  if (refreshToken === null)
    return rejectUnauthorized(originalError, expireSession(session.version, refreshToken));

  if (pendingRefresh?.version !== session.version) {
    const promise = Promise.resolve()
      .then(() => coordinateRefresh(session, refreshToken, refreshTokens))
      .finally(() => {
        if (pendingRefresh?.promise === promise) pendingRefresh = undefined;
      });
    pendingRefresh = { version: session.version, promise };
  }

  const result = await pendingRefresh.promise;
  if ('expired' in result) return rejectUnauthorized(originalError, result.expired);

  const active = synchronizedSession();
  if (active.sessionVersion !== session.version || active.accessToken === null) throw originalError;

  return active.accessToken;
}
