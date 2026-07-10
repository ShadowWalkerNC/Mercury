/**
 * Thin typed fetch wrapper.
 * Reads accessToken from authStore via lazy import (avoids circular dep).
 */

async function getToken(): Promise<string | null> {
  const { useAuthStore } = await import('@/stores/authStore');
  return useAuthStore.getState().accessToken;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { msg = (await res.json() as { message?: string }).message ?? msg; } catch { /* raw */ }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown) => request<T>('POST',   path, body),
  patch:  <T>(path: string, body: unknown) => request<T>('PATCH',  path, body),
  put:    <T>(path: string, body: unknown) => request<T>('PUT',    path, body),
  delete: <T = void>(path: string)        => request<T>('DELETE', path),
};
