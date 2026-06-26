/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as approvals from "../approvals.js";
import type * as auditEvents from "../auditEvents.js";
import type * as backfill from "../backfill.js";
import type * as behaviours from "../behaviours.js";
import type * as childMode from "../childMode.js";
import type * as choreCalculations from "../choreCalculations.js";
import type * as chores from "../chores.js";
import type * as dashboard from "../dashboard.js";
import type * as dateValidation from "../dateValidation.js";
import type * as holidayPauses from "../holidayPauses.js";
import type * as households from "../households.js";
import type * as parentInvitations from "../parentInvitations.js";
import type * as pins from "../pins.js";
import type * as rewards from "../rewards.js";
import type * as routines from "../routines.js";
import type * as security from "../security.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  approvals: typeof approvals;
  auditEvents: typeof auditEvents;
  backfill: typeof backfill;
  behaviours: typeof behaviours;
  childMode: typeof childMode;
  choreCalculations: typeof choreCalculations;
  chores: typeof chores;
  dashboard: typeof dashboard;
  dateValidation: typeof dateValidation;
  holidayPauses: typeof holidayPauses;
  households: typeof households;
  parentInvitations: typeof parentInvitations;
  pins: typeof pins;
  rewards: typeof rewards;
  routines: typeof routines;
  security: typeof security;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
