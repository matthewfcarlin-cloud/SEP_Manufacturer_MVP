// How soon a shop can start, in plain words. Built on the demo data's
// availability flag (`idleThisMonth`), which stays one quiet factor in
// matching; the words never mention idle machines.

export type StartWindow = "this_week" | "two_three_weeks";

export const START_LABELS: Record<StartWindow, string> = {
  this_week: "Can start this week",
  two_three_weeks: "Can start in 2–3 weeks",
};

export const startWindow = (canStartNow: boolean | undefined): StartWindow => (canStartNow ? "this_week" : "two_three_weeks");

/** A shop can start this week when any of its machines is free. */
export const shopStartWindow = (machines: readonly { idleThisMonth: boolean }[]): StartWindow => startWindow(machines.some((m) => m.idleThisMonth));
