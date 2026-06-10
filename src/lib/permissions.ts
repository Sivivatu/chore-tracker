import type { ParentMembership, Role } from "@/types/domain";

export function isParentForHousehold(
  clerkUserId: string | undefined,
  householdId: string,
  parents: ParentMembership[],
): boolean {
  return parents.some(
    (parent) => parent.clerkUserId === clerkUserId && parent.householdId === householdId,
  );
}

export function canAccessParentData(role: Role): boolean {
  return role === "parent";
}

export function canAccessChildRoutine(role: Role): boolean {
  return role === "child" || role === "parent";
}
