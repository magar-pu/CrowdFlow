/**
 * frontend/src/lib/ticketVault.ts
 * 
 * Dynamic Ticket Architecture v2 - Offline PWA + SubtleCrypto TOTP Vault
 * Encrypts/Imports ticket secret into non-extractable CryptoKey and manages IndexedDB storage.
 */

export interface VaultTicketRecord {
  ticketId: string;
  cryptoKey: CryptoKey;
  rawSecretKey: string;
  eventEndTime: string;
  eventName: string;
  attendeeName: string;
  tierName: string;
  seatLabel: string;
  ticketStatus: string;
  savedAt: number;
}

const DB_NAME = "CrowdFlowVaultDB";
const DB_VERSION = 1;
const STORE_NAME = "tickets_vault";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported on this environment"));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "ticketId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function base32ToBytes(base32: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output = new Uint8Array(Math.floor((cleaned.length * 5) / 8));
  let index = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const charIndex = alphabet.indexOf(cleaned[i]);
    if (charIndex < 0) continue;
    value = (value << 5) | charIndex;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return output.slice(0, index);
}

/**
 * Import raw Base32 secret into SubtleCrypto non-extractable CryptoKey
 */
export async function importSecretKey(base32Secret: string): Promise<CryptoKey> {
  const keyBytes = base32ToBytes(base32Secret);
  return await window.crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: { name: "SHA-1" } },
    false, // extractable = false for security
    ["sign"]
  );
}

/**
 * Generate 6-digit TOTP code using SubtleCrypto HMAC-SHA1
 */
export async function generateSubtleTOTP(cryptoKey: CryptoKey, intervalSeconds: number = 300): Promise<string> {
  const currentStep = Math.floor(Date.now() / 1000 / intervalSeconds);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(currentStep), false); // Big-endian integer

  const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, buffer);
  const hash = new Uint8Array(signature);

  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Save ticket record into IndexedDB
 */
export async function saveVaultTicket(ticket: Omit<VaultTicketRecord, "savedAt">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: VaultTicketRecord = { ...ticket, savedAt: Date.now() };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get ticket record from IndexedDB
 */
export async function getVaultTicket(ticketId: string): Promise<VaultTicketRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(ticketId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Delete ticket record from IndexedDB (Self-Destruct routine)
 */
export async function deleteVaultTicket(ticketId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(ticketId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Ignore error if DB opening fails
  }
}

/**
 * Self-Destruct Routine: check local device time vs Event End Time
 */
export async function checkAndRunSelfDestruct(ticketId: string, eventEndTimeIso: string): Promise<boolean> {
  if (!eventEndTimeIso) return false;
  const endTime = new Date(eventEndTimeIso).getTime();
  const now = Date.now();
  if (!isNaN(endTime) && now > endTime) {
    await deleteVaultTicket(ticketId);
    return true;
  }
  return false;
}
