# Idlefit (working name)

Upload a product idea and see how it could be manufactured, which LA-area shops have idle machines that fit it, what design tweaks make it cheaper, and a shareable pitch kit.

Club MVP. All shops are fictional demo data, and all costs are estimates. The full build spec is in [CLAUDE.md](CLAUDE.md) (`AGENTS.md` is a symlink to it for Codex).

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (needed from Phase 2)
npm run dev
```

## Checks

```bash
npm test && npm run typecheck && npm run lint && npm run build
```
