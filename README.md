# Idlefit (working name)

Upload a product idea and see how it could be manufactured, which LA-area shops have idle machines that fit it, what design tweaks make it cheaper, and a shareable pitch kit.

Club MVP. All shops are fictional demo data, and all costs are estimates. The full build spec is in [CLAUDE.md](CLAUDE.md) (`AGENTS.md` is a symlink to it for Codex).

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (needed from Phase 2)
npm run dev
```

## Demo

```bash
npm run demo:seed   # installs two pre-analyzed example projects (no API key needed)
npm run dev
```

Suggested 3-minute path: landing page → "See an example" (pedal enclosure) → paths, tweaks, and shop matches → "Open pitch kit" → back to the bracket example to show a tweak moving a part from molding to sheet metal. A live upload plus analysis takes 1–2.5 minutes with Opus, so start it early or keep it as an optional finale. Demo parts live in `demo/` (STL, regenerate with `npm run demo:stl`); STEP uploads work too.

## Checks

```bash
npm test && npm run typecheck && npm run lint && npm run build
npm run test:e2e    # drives your installed Google Chrome
```
