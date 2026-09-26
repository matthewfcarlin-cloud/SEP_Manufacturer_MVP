// Writes procedurally generated demo parts to demo/.
// Run with: npm run demo:stl
import { writeFileSync } from "node:fs";
import { openShell, toBinaryStl } from "../lib/meshes.ts";

// Pedal enclosure, 125B-style footprint: 122 × 66 × 39.5 mm, 2.5 mm walls,
// modelled lid-down with the open side at z = 0.
const pedal = toBinaryStl(openShell(122, 66, 39.5, 2.5));
writeFileSync("demo/pedal-enclosure.stl", new Uint8Array(pedal));
console.log("wrote demo/pedal-enclosure.stl");
