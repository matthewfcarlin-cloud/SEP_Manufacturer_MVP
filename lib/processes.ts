import type { Process } from "./types";

export const PROCESSES = [
  "cnc_milling",
  "cnc_turning",
  "fdm_print",
  "sla_print",
  "sls_print",
  "injection_molding",
  "sheet_metal",
  "laser_cutting",
  "urethane_casting",
] as const satisfies readonly Process[];

export const PROCESS_LABELS: Record<Process, string> = {
  cnc_milling: "CNC milling",
  cnc_turning: "CNC turning",
  fdm_print: "FDM printing",
  sla_print: "SLA printing",
  sls_print: "SLS printing",
  injection_molding: "Injection molding",
  sheet_metal: "Sheet metal",
  laser_cutting: "Laser cutting",
  urethane_casting: "Urethane casting",
};
