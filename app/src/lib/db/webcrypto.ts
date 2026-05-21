// lib/db/webcrypto — per-device ECDSA P-256 keypair management.
//
// Generates and stores a signing keypair in IndexedDB the first time an
// officer needs to sign something. The private key never leaves the
// device; the public key (as a JWK) is exported and uploaded to the
// substrate via register_signing_key. Subsequent transitions can be
// signed by the same keypair across sessions.
//
// All operations are SSR-safe: they return null when window or
// crypto.subtle isn't available.

const DB_NAME = 'civicos.keys';
const DB_VERSION = 1;
const STORE = 'signingKeys';
const KEY_NAME = 'officer';

interface StoredKeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicJwk: JsonWebKey;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
    && typeof window.indexedDB !== 'undefined'
    && typeof window.crypto !== 'undefined'
    && typeof window.crypto.subtle !== 'undefined';
}

async function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser()) return null;
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

async function readStored(): Promise<StoredKeyPair | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.get(KEY_NAME);
    req.onsuccess = () => {
      const v = req.result as { privateKey: CryptoKey; publicKey: CryptoKey; publicJwk: JsonWebKey } | undefined;
      resolve(v ?? null);
    };
    req.onerror = () => resolve(null);
  });
}

async function writeStored(value: StoredKeyPair): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise(resolve => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put(value, KEY_NAME);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/** Generate an ECDSA P-256 keypair, persist it, and return it.
 *  Idempotent: returns the existing keypair if one is present. */
export async function ensureSigningKey(): Promise<StoredKeyPair | null> {
  if (!isBrowser()) return null;
  const existing = await readStored();
  if (existing) return existing;

  const pair = await window.crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, // non-extractable private key
    ['sign', 'verify'],
  );
  const publicJwk = await window.crypto.subtle.exportKey('jwk', pair.publicKey);
  const stored: StoredKeyPair = {
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    publicJwk,
  };
  await writeStored(stored);
  return stored;
}

/** Returns the JWK of the current device's public key, generating a
 *  keypair if necessary. Used by the substrate to register the key. */
export async function publicSigningJwk(): Promise<JsonWebKey | null> {
  const k = await ensureSigningKey();
  return k?.publicJwk ?? null;
}

/** Sign a canonical message with the device's private key. Returns the
 *  signature as a lowercase hex string. Returns null when the platform
 *  doesn't support WebCrypto or the key isn't available. */
export async function signMessage(message: string): Promise<string | null> {
  if (!isBrowser()) return null;
  const k = await ensureSigningKey();
  if (!k) return null;
  const bytes = new TextEncoder().encode(message);
  const sig = await window.crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    k.privateKey,
    bytes,
  );
  const arr = new Uint8Array(sig);
  let hex = '';
  for (let i = 0; i < arr.length; i++) hex += arr[i]!.toString(16).padStart(2, '0');
  return hex;
}

/** Verify a signature given the public key JWK, canonical message, and
 *  hex signature. Returns true on success, false on failure, null when
 *  the platform doesn't support WebCrypto. Used by auditors. */
export async function verifyMessage(
  publicJwk: JsonWebKey, message: string, hexSignature: string,
): Promise<boolean | null> {
  if (!isBrowser()) return null;
  try {
    const publicKey = await window.crypto.subtle.importKey(
      'jwk', publicJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['verify'],
    );
    const bytes = new TextEncoder().encode(message);
    const sig = new Uint8Array(hexSignature.length / 2);
    for (let i = 0; i < sig.length; i++) sig[i] = parseInt(hexSignature.slice(i * 2, i * 2 + 2), 16);
    return await window.crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, publicKey, sig, bytes,
    );
  } catch {
    return false;
  }
}
