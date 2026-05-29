import crypto from 'crypto';

export const AUTH_COOKIE_NAME = 'blobcast_session';
const AUTH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const AUTH_SECRET = process.env.AUTH_SECRET || 'blobcast-dev-secret-change-me';

export type AuthTokenPayload = {
  userId: string;
  exp: number;
  nonce: string;
};

export function createAuthToken(userId: string) {
  const payload: AuthTokenPayload = {
    userId,
    exp: Date.now() + AUTH_TOKEN_TTL_MS,
    nonce: crypto.randomBytes(16).toString('hex')
  };

  const payloadSegment = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payloadSegment).digest('base64url');

  return `${payloadSegment}.${signature}`;
}

export function verifyAuthToken(token?: string | null): AuthTokenPayload | null {
  if (!token) return null;

  const [payloadSegment, signature] = token.split('.');
  if (!payloadSegment || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(payloadSegment).digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8')) as AuthTokenPayload;
    if (!payload?.userId || !payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) return {} as Record<string, string>;

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join('='));
    return cookies;
  }, {});
}

export function buildAuthCookie(token: string) {
  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(AUTH_TOKEN_TTL_MS / 1000)}`
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function clearAuthCookie() {
  return [
    `${AUTH_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ].join('; ');
}