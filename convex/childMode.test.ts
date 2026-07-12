/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function identity(id: string) {
  return {
    subject: id,
    tokenIdentifier: `https://clerk.example|${id}`,
    issuer: "https://clerk.example",
  };
}

async function createHousehold(id = "owner") {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(identity(id));
  const created = await owner.mutation(api.households.createInitialHousehold, {
    householdName: "The Example Household",
    parentName: "Alex",
    childName: "Sam",
    parentPin: "2468",
  });
  const childId = await t.run(async (ctx) => {
    const child = await ctx.db
      .query("children")
      .withIndex("by_household", (query) => query.eq("householdId", created.householdId))
      .unique();
    if (!child) throw new Error("Child not created");
    return child._id;
  });

  return { t, owner, childId, ...created };
}

async function createRoutine({
  t,
  householdId,
  parentId,
  childId,
  status = "not_started",
  steps = [
    { title: "Brush teeth", points: 5, required: true, illustrationKey: "teeth", accent: "#38bdf8" },
    { title: "Get dressed", points: 5, required: true, illustrationKey: "shirt", accent: "#38bdf8" },
    { title: "Pack bag", points: 5, required: true, illustrationKey: "bag", accent: "#38bdf8" },
  ],
}: {
  t: Awaited<ReturnType<typeof createHousehold>>["t"];
  householdId: Id<"households">;
  parentId: Id<"parents">;
  childId: Id<"children">;
  status?: "not_started" | "in_progress" | "submitted" | "approved" | "rejected" | "paused";
  steps?: Array<{
    title: string;
    points: number;
    required: boolean;
    illustrationKey?: string;
    accent?: string;
  }>;
}) {
  return await t.run(async (ctx) => {
    const routineTemplateId = await ctx.db.insert("routineTemplates", {
      householdId,
      name: "Morning routine",
      type: "morning",
      active: true,
      schedule: ["Mon"],
      createdByParentId: parentId,
    });
    const routineInstanceId = await ctx.db.insert("routineInstances", {
      householdId,
      childId,
      routineTemplateId,
      date: "2026-06-29",
      status,
      snapshotName: "Morning routine",
      snapshotType: "morning",
      ...(status === "rejected"
        ? {
            rejectedAt: "2026-06-29T07:30:00.000Z",
            rejectionNote: "Please try again.",
          }
        : {}),
    });
    const stepIds: Id<"stepInstances">[] = [];

    for (const [index, step] of steps.entries()) {
      const stepId = await ctx.db.insert("stepInstances", {
        householdId,
        childId,
        routineInstanceId,
        snapshotTitle: step.title,
        snapshotDescription: `${step.title}.`,
        snapshotOrder: index + 1,
        snapshotPoints: step.points,
        snapshotRequired: step.required,
        snapshotIllustrationKey: step.illustrationKey ?? "teeth",
        accent: step.accent ?? "#38bdf8",
      });
      stepIds.push(stepId);
    }

    return { routineInstanceId, stepIds };
  });
}

async function getChild(
  t: Awaited<ReturnType<typeof createHousehold>>["t"],
  childId: Id<"children">,
) {
  return await t.run(async (ctx) => await ctx.db.get(childId));
}

async function getRoutineApprovalAudit(
  t: Awaited<ReturnType<typeof createHousehold>>["t"],
  routineInstanceId: Id<"routineInstances">,
) {
  return await t.run(async (ctx) => {
    const events = await ctx.db.query("auditEvents").collect();
    return events.find(
      (event) =>
        event.action === "Routine approved" &&
        event.metadata?.routineInstanceId === routineInstanceId,
    );
  });
}

async function getRoutineState(
  t: Awaited<ReturnType<typeof createHousehold>>["t"],
  routineInstanceId: Id<"routineInstances">,
) {
  return await t.run(async (ctx) => {
    const instance = await ctx.db.get(routineInstanceId);
    const steps = await ctx.db
      .query("stepInstances")
      .withIndex("by_routine_instance", (query) => query.eq("routineInstanceId", routineInstanceId))
      .collect();

    return { instance, steps: steps.sort((a, b) => a.snapshotOrder - b.snapshotOrder) };
  });
}

describe("child routine mode", () => {
  it("saves selected routine steps as in progress without entering the approval queue", async () => {
    const { t, owner, householdId, parentId, childId } = await createHousehold();
    const { routineInstanceId, stepIds } = await createRoutine({
      t,
      householdId,
      parentId,
      childId,
    });

    await owner.mutation(api.childMode.saveRoutineProgress, {
      householdId,
      childId,
      routineInstanceId,
      completedStepIds: [stepIds[0], stepIds[1]],
    });

    const { instance, steps } = await getRoutineState(t, routineInstanceId);
    const queue = await owner.query(api.approvals.queue, { householdId });

    expect(instance).toMatchObject({ status: "in_progress" });
    expect(instance).not.toHaveProperty("submittedAt");
    expect(steps.map((step) => Boolean(step.completedAt))).toEqual([true, true, false]);
    expect(queue).toEqual([]);
  });

  it("continues same-day saved progress and then submits for approval", async () => {
    const { t, owner, householdId, parentId, childId } = await createHousehold();
    const { routineInstanceId, stepIds } = await createRoutine({
      t,
      householdId,
      parentId,
      childId,
    });

    await owner.mutation(api.childMode.saveRoutineProgress, {
      householdId,
      childId,
      routineInstanceId,
      completedStepIds: [stepIds[0]],
    });
    await owner.mutation(api.childMode.saveRoutineProgress, {
      householdId,
      childId,
      routineInstanceId,
      completedStepIds: [stepIds[0], stepIds[2]],
    });

    let state = await getRoutineState(t, routineInstanceId);
    expect(state.instance).toMatchObject({ status: "in_progress" });
    expect(state.steps.map((step) => Boolean(step.completedAt))).toEqual([true, false, true]);

    await owner.mutation(api.childMode.submitRoutine, {
      householdId,
      childId,
      routineInstanceId,
      completedStepIds: [stepIds[0], stepIds[2]],
    });

    state = await getRoutineState(t, routineInstanceId);
    const queue = await owner.query(api.approvals.queue, { householdId });
    expect(state.instance).toMatchObject({ status: "submitted" });
    expect(state.instance?.submittedAt).toEqual(expect.any(String));
    expect(queue.map((routine) => routine._id)).toEqual([routineInstanceId]);
  });

  it("rejects progress saves for submitted, approved and paused routines", async () => {
    const { t, owner, householdId, parentId, childId } = await createHousehold();

    for (const status of ["submitted", "approved", "paused"] as const) {
      const { routineInstanceId, stepIds } = await createRoutine({
        t,
        householdId,
        parentId,
        childId,
        status,
      });

      await expect(
        owner.mutation(api.childMode.saveRoutineProgress, {
          householdId,
          childId,
          routineInstanceId,
          completedStepIds: [stepIds[0]],
        }),
      ).rejects.toThrow("Routine is read-only");
    }
  });

  it("allows rejected routines to be edited and resubmitted with rejection fields cleared", async () => {
    const { t, owner, householdId, parentId, childId } = await createHousehold();
    const { routineInstanceId, stepIds } = await createRoutine({
      t,
      householdId,
      parentId,
      childId,
      status: "rejected",
    });

    await owner.mutation(api.childMode.saveRoutineProgress, {
      householdId,
      childId,
      routineInstanceId,
      completedStepIds: [stepIds[1]],
    });

    let state = await getRoutineState(t, routineInstanceId);
    expect(state.instance).toMatchObject({
      status: "in_progress",
    });
    expect(state.instance).not.toHaveProperty("rejectedAt");
    expect(state.instance).not.toHaveProperty("rejectionNote");

    await owner.mutation(api.childMode.submitRoutine, {
      householdId,
      childId,
      routineInstanceId,
      completedStepIds: [stepIds[1], stepIds[2]],
    });

    state = await getRoutineState(t, routineInstanceId);
    expect(state.instance).toMatchObject({
      status: "submitted",
    });
    expect(state.instance).not.toHaveProperty("rejectedAt");
    expect(state.instance).not.toHaveProperty("rejectionNote");
  });

  it("approval awards completed points when all required routine steps are complete", async () => {
    const { t, owner, householdId, parentId, childId } = await createHousehold();
    const { routineInstanceId, stepIds } = await createRoutine({
      t,
      householdId,
      parentId,
      childId,
      steps: [
        { title: "Brush teeth", points: 4, required: true },
        { title: "Pack bag", points: 6, required: true },
        { title: "Read quietly", points: 3, required: false },
      ],
    });

    await owner.mutation(api.childMode.submitRoutine, {
      householdId,
      childId,
      routineInstanceId,
      completedStepIds: stepIds,
    });
    await owner.mutation(api.approvals.approve, { householdId, routineInstanceId });

    const child = await getChild(t, childId);
    const auditEvent = await getRoutineApprovalAudit(t, routineInstanceId);

    expect(child?.pointsBalance).toBe(13);
    expect(auditEvent?.metadata).toMatchObject({
      earnedPoints: 13,
      missedRequiredStepCount: 0,
      requiredStepsComplete: true,
    });
  });

  it("approval awards zero points when a required routine step is missed", async () => {
    const { t, owner, householdId, parentId, childId } = await createHousehold();
    const { routineInstanceId, stepIds } = await createRoutine({
      t,
      householdId,
      parentId,
      childId,
      steps: [
        { title: "Brush teeth", points: 4, required: true },
        { title: "Pack bag", points: 6, required: true },
      ],
    });

    await owner.mutation(api.childMode.submitRoutine, {
      householdId,
      childId,
      routineInstanceId,
      completedStepIds: [stepIds[0]],
    });
    await owner.mutation(api.approvals.approve, { householdId, routineInstanceId });

    const child = await getChild(t, childId);
    const { instance } = await getRoutineState(t, routineInstanceId);
    const auditEvent = await getRoutineApprovalAudit(t, routineInstanceId);

    expect(instance).toMatchObject({ status: "approved", earnedPoints: 0 });
    expect(child?.pointsBalance).toBe(0);
    expect(auditEvent?.metadata).toMatchObject({
      earnedPoints: 0,
      missedRequiredStepCount: 1,
      requiredStepsComplete: false,
    });
  });

  it("approval awards zero points when only optional routine steps are complete", async () => {
    const { t, owner, householdId, parentId, childId } = await createHousehold();
    const { routineInstanceId, stepIds } = await createRoutine({
      t,
      householdId,
      parentId,
      childId,
      steps: [
        { title: "Brush teeth", points: 4, required: true },
        { title: "Read quietly", points: 3, required: false },
      ],
    });

    await owner.mutation(api.childMode.submitRoutine, {
      householdId,
      childId,
      routineInstanceId,
      completedStepIds: [stepIds[1]],
    });
    await owner.mutation(api.approvals.approve, { householdId, routineInstanceId });

    const child = await getChild(t, childId);

    expect(child?.pointsBalance).toBe(0);
  });

  it("approval ignores incomplete optional routine steps when required steps are complete", async () => {
    const { t, owner, householdId, parentId, childId } = await createHousehold();
    const { routineInstanceId, stepIds } = await createRoutine({
      t,
      householdId,
      parentId,
      childId,
      steps: [
        { title: "Brush teeth", points: 4, required: true },
        { title: "Read quietly", points: 3, required: false },
      ],
    });

    await owner.mutation(api.childMode.submitRoutine, {
      householdId,
      childId,
      routineInstanceId,
      completedStepIds: [stepIds[0]],
    });
    await owner.mutation(api.approvals.approve, { householdId, routineInstanceId });

    const child = await getChild(t, childId);

    expect(child?.pointsBalance).toBe(4);
  });
});
