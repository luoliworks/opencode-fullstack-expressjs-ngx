// Maps raw backend error text to i18n keys. Unknown text passes through
// untouched (usually English from the API).
const BACKEND_ERROR_KEYS: Record<string, string> = {
  'Invalid credentials': 'errors.invalidCredentials',
  'username or email already exists': 'errors.userExists',
  'slug already exists': 'errors.slugExists',
  'Missing or invalid Authorization header': 'errors.authHeader',
  'Invalid or expired token': 'errors.tokenInvalid',
  'Forbidden: insufficient role': 'errors.forbidden',
  'Authentication required': 'errors.authRequired',
  'Invalid id': 'errors.invalidId',
  'Not found': 'errors.notFound',
  'title is required': 'errors.titleRequired',
  'slug is required': 'errors.slugRequired',
  "status must be 'draft' or 'published'": 'errors.statusInvalid',
  'username is required': 'errors.usernameRequired',
  'valid email is required': 'errors.emailInvalid',
  'password must be at least 8 characters': 'errors.passwordShort',
  "role must be 'admin', 'editor' or 'viewer'": 'errors.roleInvalid',
  'username and password are required': 'errors.loginRequired',
  'page and pageSize must be positive integers': 'errors.pageInvalid',
  'Invalid slug': 'errors.slugInvalid',
};

// Sync translator hook, registered once by LanguageService (TranslateService
// can only be injected, and this module is a plain function library).
let translateFn: ((key: string) => string) | null = null;

export function setApiErrorTranslator(fn: (key: string) => string): void {
  translateFn = fn;
}

export function apiError(err: unknown, fallbackKey = 'errors.requestFailed'): string {
  const body = (err as { error?: unknown })?.error;
  const raw: string | null =
    typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : null;
  if (raw !== null) {
    const key = BACKEND_ERROR_KEYS[raw];
    if (key !== undefined && translateFn !== null) {
      const translated = translateFn(key);
      if (translated !== key) return translated;
    }
    return raw;
  }
  if (translateFn !== null) {
    const translated = translateFn(fallbackKey);
    if (translated !== fallbackKey) return translated;
  }
  return 'Request failed, please retry.';
}
