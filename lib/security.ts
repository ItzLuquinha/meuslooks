import crypto from 'node:crypto';

function key() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY não configurada.');
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

export function encryptText(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptText(payload: string) {
  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (!ivPart || !tagPart || !dataPart) throw new Error('Credencial criptografada inválida.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64url')), decipher.final()]).toString('utf8');
}

export function createAdminSession() {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7;
  return encryptText(JSON.stringify({ email: process.env.ADMIN_EMAIL, exp, v: 1 }));
}

export function readAdminSession(token?: string | null) {
  if (!token) return null;
  try {
    const value = JSON.parse(decryptText(token)) as { email?: string; exp?: number };
    if (!value.email || value.email !== process.env.ADMIN_EMAIL || !value.exp || value.exp < Date.now()) return null;
    return { email: value.email };
  } catch {
    return null;
  }
}

export function validatePassword(password: string) {
  return password.length >= 8 && password.length <= 128;
}
