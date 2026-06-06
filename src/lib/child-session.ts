const storageKey = "chore-tracker-child-session";
const parentReturnPathKey = "chore-tracker-parent-return-path";

export type ChildModeSession = {
  childId: string;
  householdId: string;
  unlockedAt: string;
};

export function verifyChildPin(input: string, storedPinHash: string): boolean {
  return input.trim() === storedPinHash;
}

export function createChildSession(childId: string, householdId: string): ChildModeSession {
  return {
    childId,
    householdId,
    unlockedAt: new Date().toISOString(),
  };
}

export function saveChildSession(session: ChildModeSession): void {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

export function readChildSession(): ChildModeSession | null {
  const value = localStorage.getItem(storageKey);
  if (!value) return null;
  try {
    return JSON.parse(value) as ChildModeSession;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function clearChildSession(): void {
  localStorage.removeItem(storageKey);
}

export function hasActiveChildSession(): boolean {
  return readChildSession() !== null;
}

export function saveParentReturnPath(path: string): void {
  sessionStorage.setItem(parentReturnPathKey, path);
}

export function readParentReturnPath(): string | null {
  return sessionStorage.getItem(parentReturnPathKey);
}

export function clearParentReturnPath(): void {
  sessionStorage.removeItem(parentReturnPathKey);
}
