// Pre-analyzed example projects shipped in demo/ and installed by
// `npm run demo:seed`. The landing page links to whichever are installed.
// `files` maps each stored file name to its source in demo/.
export const DEMO_PROJECTS = [
  {
    id: "yAeM9-RDOE",
    json: "demo/sample-project.json",
    files: { "model.stl": "demo/pedal-enclosure.stl" },
    tagline: "Hero part: a boutique pedal enclosure at 250 units",
  },
  {
    id: "Dr9z34I2mA",
    json: "demo/bracket-project.json",
    files: { "model.stl": "demo/charger-bracket.stl", "v2-model.stl": "demo/charger-bracket-sheet.stl" },
    tagline: "A molded bracket, redrawn as bent sheet metal in v2",
  },
] as const;
