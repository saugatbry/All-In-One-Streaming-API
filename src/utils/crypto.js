import crypto from 'crypto';

export function decryptAES(inputHex, key, iv) {
  const keyBuf = Buffer.from(key, 'utf-8');
  const ivBuf = Buffer.from(iv, 'utf-8');
  const encrypted = Buffer.from(inputHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-128-cbc', keyBuf, ivBuf);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf-8');
}

export function decryptAESBase64(inputB64, key, iv) {
  const keyBuf = Buffer.from(key, 'utf-8');
  const ivBuf = Buffer.from(iv, 'utf-8');
  let encrypted;
  try {
    encrypted = Buffer.from(inputB64, 'base64');
  } catch (e) {
    return null;
  }
  const decipher = crypto.createDecipheriv('aes-128-cbc', keyBuf, ivBuf);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf-8');
}
