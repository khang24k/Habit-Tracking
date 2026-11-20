import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SESSION_TTL_SECONDS,
  buildClearSessionCookieOptions,
  buildSessionCookieOptions,
  hashPassword,
  hashSessionToken,
  isSecureRequest,
  parseCookieValue,
  verifyPassword,
} from '../auth';

test('hashPassword produces unique salted hashes that verify correctly', () => {
  const h1 = hashPassword('matkhau123');
  const h2 = hashPassword('matkhau123');

  assert.notEqual(h1, h2);
  assert.equal(verifyPassword('matkhau123', h1), true);
  assert.equal(verifyPassword('matkhau123', h2), true);
  assert.equal(verifyPassword('sai-mat-khau', h1), false);
});

test('verifyPassword safely rejects malformed stored hashes', () => {
  assert.equal(verifyPassword('abc', ''), false);
  assert.equal(verifyPassword('abc', 'invalid-no-colon'), false);
  assert.equal(verifyPassword('abc', 'salt:short'), false);
});

test('hashSessionToken is deterministic SHA-256 hex', () => {
  const a = hashSessionToken('sample-token');
  const b = hashSessionToken('sample-token');
  const c = hashSessionToken('other-token');
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(a.length, 64);
});

test('isSecureRequest checks x-forwarded-proto before request URL protocol', () => {
  const httpsReq = new Request('https://mylife.vercel.app/api/auth/login');
  assert.equal(isSecureRequest(httpsReq), true);

  const localhostHttpReq = new Request('http://localhost:3000/api/auth/login');
  assert.equal(isSecureRequest(localhostHttpReq), false);

  const lanHttpReq = new Request('http://192.168.1.5:3000/api/auth/logout');
  assert.equal(isSecureRequest(lanHttpReq), false);

  const proxiedHttpsReq = new Request('http://internal:3000/api/auth/login', {
    headers: { 'x-forwarded-proto': 'https, http' },
  });
  assert.equal(isSecureRequest(proxiedHttpsReq), true);

  const proxiedHttpReq = new Request('https://internal/api/auth/login', {
    headers: { 'x-forwarded-proto': 'http' },
  });
  assert.equal(isSecureRequest(proxiedHttpReq), false);
});

test('parseCookieValue extracts cookie values safely', () => {
  assert.equal(parseCookieValue(null, 'mylife_session'), null);
  assert.equal(
    parseCookieValue('foo=bar; mylife_session=tok%3D123; baz=1', 'mylife_session'),
    'tok=123',
  );
  assert.equal(parseCookieValue('foo=bar', 'mylife_session'), null);
});

test('buildSessionCookieOptions and buildClearSessionCookieOptions set persistent and clear flags', () => {
  const nowMs = 1_700_000_000_000;
  const setOpts = buildSessionCookieOptions(true, nowMs);
  assert.equal(setOpts.httpOnly, true);
  assert.equal(setOpts.sameSite, 'lax');
  assert.equal(setOpts.secure, true);
  assert.equal(setOpts.path, '/');
  assert.equal(setOpts.maxAge, SESSION_TTL_SECONDS);
  assert.equal(setOpts.expires.getTime(), nowMs + SESSION_TTL_SECONDS * 1000);

  const clearOpts = buildClearSessionCookieOptions(false);
  assert.equal(clearOpts.httpOnly, true);
  assert.equal(clearOpts.sameSite, 'lax');
  assert.equal(clearOpts.secure, false);
  assert.equal(clearOpts.path, '/');
  assert.equal(clearOpts.maxAge, 0);
  assert.equal(clearOpts.expires.getTime(), 0);
});
