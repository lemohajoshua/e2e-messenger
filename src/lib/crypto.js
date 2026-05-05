export async function generateRSAKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  )
}

export async function exportPublicKey(publicKey) {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}

export async function importPublicKey(base64Key) {
  const binary = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
  return await window.crypto.subtle.importKey(
    "spki",
    binary,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  )
}

export async function exportPrivateKey(privateKey) {
  return await window.crypto.subtle.exportKey("jwk", privateKey)
}

export async function importPrivateKey(jwk) {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  )
}

async function deriveKeyFromPassword(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encryptPrivateKey(jwk, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const derivedKey = await deriveKeyFromPassword(password, salt)
  const encoded = new TextEncoder().encode(JSON.stringify(jwk))
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    encoded
  )
  return {
    ciphertext: Array.from(new Uint8Array(encrypted)),
    iv: Array.from(iv),
    salt: Array.from(salt),
  }
}

export async function decryptPrivateKey(encryptedData, password) {
  const { ciphertext, iv, salt } = encryptedData
  const derivedKey = await deriveKeyFromPassword(password, new Uint8Array(salt))
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    derivedKey,
    new Uint8Array(ciphertext)
  )
  const jwk = JSON.parse(new TextDecoder().decode(decrypted))
  return importPrivateKey(jwk)
}

export async function encryptMessage(plaintext, recipientPublicKey) {
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  )
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encryptedMessage = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoded
  )
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey)
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawAesKey
  )
  return {
    encryptedMessage: Array.from(new Uint8Array(encryptedMessage)),
    encryptedAesKey: Array.from(new Uint8Array(encryptedAesKey)),
    iv: Array.from(iv),
  }
}

export async function decryptMessage(encryptedPayload, privateKey) {
  const { encryptedMessage, encryptedAesKey, iv } = encryptedPayload
  const aesKeyRaw = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    new Uint8Array(encryptedAesKey)
  )
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    aesKeyRaw,
    "AES-GCM",
    false,
    ["decrypt"]
  )
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    aesKey,
    new Uint8Array(encryptedMessage)
  )
  return new TextDecoder().decode(decrypted)
}