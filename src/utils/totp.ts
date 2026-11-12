/**
 * RFC 6238 Time-Based One-Time Password (TOTP) Implementation
 * Compatible with Google Authenticator, Microsoft Authenticator, Authy, and 1Password.
 * Uses browser Web Crypto API (crypto.subtle).
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Generate a random 16-character Base32 secret key
export function generateBase32Secret(length = 16): string {
  let secret = '';
  const randomBytes = new Uint8Array(length);
  window.crypto.getRandomValues(randomBytes);
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[randomBytes[i] % 32];
  }
  return secret;
}

// Decode Base32 string to Uint8Array
function base32ToUint8Array(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }
  return bytes;
}

// Generate TOTP token for a specific time step
export async function generateTotpCode(secret: string, timeStepOffset = 0): Promise<string> {
  const stepSeconds = 30;
  const timeStep = Math.floor(Date.now() / 1000 / stepSeconds) + timeStepOffset;

  // 8-byte big-endian counter
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(timeStep));

  const keyBytes = base32ToUint8Array(secret);
  const keyArrayBuffer = keyBytes.buffer.slice(
    keyBytes.byteOffset,
    keyBytes.byteOffset + keyBytes.byteLength
  ) as ArrayBuffer;

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyArrayBuffer,
    { name: 'HMAC', hash: { name: 'SHA-1' } },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, buffer);
  const hashBytes = new Uint8Array(signature);

  // Dynamic truncation (RFC 4226)
  const offset = hashBytes[hashBytes.length - 1] & 0xf;
  const binary =
    ((hashBytes[offset] & 0x7f) << 24) |
    ((hashBytes[offset + 1] & 0xff) << 16) |
    ((hashBytes[offset + 2] & 0xff) << 8) |
    (hashBytes[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

// Verify entered 6-digit TOTP code with ±1 step window (±30s)
export async function verifyTotpCode(secret: string, userCode: string): Promise<boolean> {
  const cleanUserCode = userCode.trim().replace(/\s+/g, '');
  if (cleanUserCode.length !== 6 || !/^\d{6}$/.test(cleanUserCode)) {
    return false;
  }

  // Check current, previous, and next time windows
  for (let offset = -1; offset <= 1; offset++) {
    try {
      const validCode = await generateTotpCode(secret, offset);
      if (validCode === cleanUserCode) {
        return true;
      }
    } catch (e) {
      console.warn('Erro ao verificar TOTP:', e);
    }
  }

  return false;
}

// Construct standard otpauth:// URL for Google Authenticator QR Code
export function buildOtpAuthUri(email: string, secret: string, issuer = 'ION Sistemas'): string {
  const cleanEmail = encodeURIComponent(email);
  const cleanIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${cleanIssuer}:${cleanEmail}?secret=${secret}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}
