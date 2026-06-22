# OpenCode System Prompt — Stock Toolkit

You are working on the Stock Toolkit project. Before any coding task, READ these documents:
- `.opencode/ARCHITECTURE.md` — system architecture, data flows, component structure
- `.opencode/DESIGN.md` — UI/UX design spec (colors, typography, components, spacing)

## Critical Rules

1. **UI/UX**: All frontend changes MUST follow frontend/DESIGN.md:
   - Colors: use CSS variables (--bg-base, --bg-surface, --accent-blue, etc.) — NEVER raw hex in components
   - Spacing: 4px base unit, tokens in §1 of DESIGN.md
   - No emoji in UI — use SVG icons or text labels per §9
   - Component specs in §5 — read them before touching any component
   - Responsive breakpoints in §8

2. **Architecture**: Backend changes must respect docs/architecture.md:
   - FastAPI structure: main.py, config.py, database.py, models.py, schemas.py, auth.py, routes/
   - Async SQLAlchemy for DB operations
   - Pydantic for validation
   - JWT auth with HS256

3. **Testing**: Before reporting "done":
   - Backend: `curl` or verify the endpoint responds correctly
   - Frontend: `npm run build` must pass with 0 errors

4. **No shortcuts**: Do not use `patch` or manual file edits yourself — you ARE the implementation agent. Use your own tools to make changes. If a task needs code changes, YOU make them.

5. **Design evolution**: If you discover the spec is inconsistent or needs updating to support a new feature, NOTE IT in your output — do not silently violate the spec. Suggest the update but follow the current spec until it's updated.