export type Role = "parent" | "child";
export type RoutineType = "morning" | "evening" | "weekend" | "custom";
export type RoutineStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "approved"
  | "rejected"
  | "paused";
export type CalendarStatus = RoutineStatus | "missed";

export type Household = {
  id: string;
  name: string;
};

export type ParentMembership = {
  id: string;
  householdId: string;
  clerkUserId: string;
  name: string;
};

export type ChildProfile = {
  id: string;
  householdId: string;
  name: string;
  pinHash: string;
  avatarColour: string;
  pointsBalance: number;
};

export type ChoreStepTemplate = {
  id: string;
  householdId: string;
  routineTemplateId: string;
  title: string;
  description: string;
  order: number;
  points: number;
  required: boolean;
  illustrationKey: string;
  accent: string;
};

export type RoutineTemplate = {
  id: string;
  householdId: string;
  name: string;
  type: RoutineType;
  active: boolean;
  schedule: string[];
  createdByParentId: string;
  steps: ChoreStepTemplate[];
};

export type DailyStepInstance = {
  id: string;
  routineInstanceId: string;
  householdId: string;
  childId: string;
  snapshotTitle: string;
  snapshotDescription: string;
  snapshotOrder: number;
  snapshotPoints: number;
  snapshotRequired: boolean;
  snapshotIllustrationKey: string;
  accent: string;
  completedAt?: string;
  completedByChildId?: string;
};

export type DailyRoutineInstance = {
  id: string;
  householdId: string;
  childId: string;
  routineTemplateId: string;
  date: string;
  status: RoutineStatus;
  snapshotName: string;
  snapshotType: RoutineType;
  submittedAt?: string;
  approvedAt?: string;
  approvedByParentId?: string;
  rejectedAt?: string;
  rejectionNote?: string;
  steps: DailyStepInstance[];
};

export type RewardOption = {
  id: string;
  householdId: string;
  title: string;
  pointsCost: number;
  active: boolean;
};

export type HolidayPause = {
  id: string;
  householdId: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdByParentId: string;
};

export type AuditEvent = {
  id: string;
  householdId: string;
  actorId: string;
  action: string;
  createdAt: string;
};
