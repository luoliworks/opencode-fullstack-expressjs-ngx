export function apiError(err: unknown, fallback = '请求失败，请重试。'): string {
  const body = (err as { error?: unknown })?.error;
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return fallback;
}
