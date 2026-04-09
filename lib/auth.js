import { SignJWT, jwtVerify } from 'jose';
import { serialize, parse } from 'cookie';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_change_in_production'
);
const COOKIE = 'gallery_admin_token';

export async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie', serialize(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
    path: '/',
  }));
}

export function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', serialize(COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  }));
}

export function getTokenFromRequest(req) {
  const cookies = parse(req.headers.cookie || '');
  return cookies[COOKIE] || null;
}
