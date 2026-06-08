const hashPrefix = "sha256:";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return `${hashPrefix}${toHex(digest)}`;
}

export async function verifyPin(pin: string, storedPinHash: string | undefined, salt: string) {
  if (!storedPinHash) return false;

  const trimmedPin = pin.trim();
  if (!storedPinHash.startsWith(hashPrefix)) {
    return storedPinHash === trimmedPin;
  }

  return storedPinHash === (await hashPin(trimmedPin, salt));
}
