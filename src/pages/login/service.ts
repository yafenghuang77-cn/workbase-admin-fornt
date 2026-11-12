import { parseAuthTokens } from '@/stores/auth';
import { http } from '@/utils/http';

export interface LoginCredentials {
  username: string;
  password: string;
}

export async function signIn(credentials: LoginCredentials, signal: AbortSignal) {
  const data = await http.post<unknown>('/auth/login', credentials, {
    signal,
    skipAuth: true,
    skipDedupe: true,
    silent: true,
  });

  return parseAuthTokens(data);
}
