import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, hashSessionToken, verifyPassword } from '../auth';

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
