const storageKey = "chore-tracker-child-session";
const parentReturnPathKey = "chore-tracker-parent-return-path";

export type ChildModeSession = {
  childId: string;
  householdId: string;
  token: string;
  expiresAt: string;
  unlockedAt: string;
};

export function verifyChildPin(input: string, storedPinHash: string): boolean {
  return input.trim() === storedPinHash;
}

export function createChildSession(
  childId: string,
  householdId: string,
  token: string,
  expiresAt: string,
): ChildModeSession {
  return {
    childId,
    householdId,
    token,
    expiresAt,
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
    const session = JSON.parse(value) as Partial<ChildModeSession>;
    if (
      !session.childId ||
      !session.householdId ||
      !session.token ||
      !session.expiresAt ||
      new Date(session.expiresAt).getTime() <= Date.now()
    ) {
      clearChildSession();
      return null;
    }
    return session as ChildModeSession;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function clearChildSession(): void {
  localStorage.removeItem(storageKey);
}

export function hasActiveChildSession(): boolean {
  const value = localStorage.getItem(storageKey);
  if (!value) return false;
  try {
    const session = JSON.parse(value) as Partial<ChildModeSession>;
    if (!session.childId || !session.householdId) return false;
    return !session.expiresAt || new Date(session.expiresAt).getTime() > Date.now();
  } catch {
    return false;
  }
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
