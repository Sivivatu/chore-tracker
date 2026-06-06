import { beforeEach, describe, expect, it } from "vitest";
import {
  clearChildSession,
  clearParentReturnPath,
  createChildSession,
  hasActiveChildSession,
  readParentReturnPath,
  readChildSession,
  saveParentReturnPath,
  saveChildSession,
  verifyChildPin,
} from "@/lib/child-session";

describe("child session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("unlocks only with the configured child PIN", () => {
    expect(verifyChildPin("1234", "1234")).toBe(true);
    expect(verifyChildPin("0000", "1234")).toBe(false);
  });

  it("stores child mode without granting parent permissions", () => {
    const session = createChildSession("child-1", "household-1");
    saveChildSession(session);
    expect(readChildSession()).toMatchObject({
      childId: "child-1",
      householdId: "household-1",
    });
    expect(hasActiveChildSession()).toBe(true);
    clearChildSession();
    expect(readChildSession()).toBeNull();
    expect(hasActiveChildSession()).toBe(false);
  });

  it("stores the parent return path separately from child mode", () => {
    saveParentReturnPath("/parent/routines");
    expect(readParentReturnPath()).toBe("/parent/routines");
    clearParentReturnPath();
    expect(readParentReturnPath()).toBeNull();
  });
});
