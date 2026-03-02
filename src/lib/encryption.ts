import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit IV — optimal for GCM mode
const AUTH_TAG_LENGTH = 16 // 128-bit tag — detects any tampering

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY?.trim()
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Got ${keyHex?.length ?? 0} chars. ` +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-separated string: hex(iv):hex(authTag):hex(ciphertext)
 *
 * The GCM authentication tag ensures:
 *  - The ciphertext cannot be modified without detection
 *  - Decryption with the wrong key will throw, never silently return garbage
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts a value produced by encrypt().
 * Throws if the data has been tampered with or the key is wrong.
 */
export function decrypt(encryptedData: string): string {
  const key = getKey()
  const parts = encryptedData.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted data format')
  const [ivHex, authTagHex, ciphertextHex] = parts
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'), {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]).toString('utf8')
}

/**
 * Returns a safe masked representation for display in the UI.
 * e.g. "AIzaSyCgpw...oO0"
 * The actual value is never sent to the browser.
 */
export function maskApiKey(key: string): string {
  if (key.length <= 12) return '••••••••••••'
  return `${key.slice(0, 10)}...${key.slice(-4)}`
}
