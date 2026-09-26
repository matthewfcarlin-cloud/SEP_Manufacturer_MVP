import type { AppliedTweak, ManufacturingPath, ProjectVersion } from "./types";

export type TweakOption = { key: string; process: ManufacturingPath["process"]; tweak: ManufacturingPath["designTweaks"][number] };

/** Every design tweak in a version's analysis, keyed "pathIndex.tweakIndex". */
export function listTweaks(version: ProjectVersion): TweakOption[] {
  return (version.analysis?.paths ?? []).flatMap((path, p) =>
    path.designTweaks.map((tweak, t) => ({ key: `${p}.${t}`, process: path.process, tweak })),
  );
}

/** Looks a tweak key up in the version's own analysis. Undefined if it isn't there. */
export function resolveTweak(version: ProjectVersion, key: string): AppliedTweak | undefined {
  const option = listTweaks(version).find((o) => o.key === key);
  if (!option) return undefined;
  return { fromVersion: version.number, process: option.process, ...option.tweak };
}
