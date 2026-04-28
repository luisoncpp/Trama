# Documentation Schema

This file defines the organization, purpose, and content rules for every folder in `docs/`.

## Folder Map

```
docs/
├── START-HERE.md          Primary entry point for new conversations
├── dev-workflow.md       Build/test/lint/checklist rules for contributors
├── schema.md             This file — folder structure and content rules
├── update.md             Guide for updating the documentation.
├── README.md              Redirects to START-HERE.md (do not edit)
│
├── flows/                 Trigger-oriented execution guides (changes frequently)
│   └── README.md         Index of end-to-end behavior flows
│
├── live/                  Live state and project reference (changes frequently)
│   ├── current-status.md  Feature status: implemented/pending
│   ├── file-map.md        File ownership registry
│   └── troubleshooting.md Cross-feature runtime issues
│
├── architecture/          Canonical technical guides (source of truth)
│   └── README.md         Folder index
│
├── spec/                  Feature specifications (what the system should do)
│   └── README.md         Folder index
│
├── plan/                  Active implementation plans (in progress)
│   └── README.md         Folder index
│
├── plan/done/             Completed implementation plans
│   └── README.md         Archive index
│
└── lessons-learned/       Counter-intuitive facts and effective strategies
    └── README.md         Index of all entries
```

---

## Folder Rules

### `docs/` (root)

**Purpose:** Entry points and cross-cutting concerns that touch multiple folders.

**Rules:**
- No root file should duplicate content that lives in subfolders.
- Every root file should reference other docs rather than restating them.
- If content grows beyond 1-2 sentences for a topic, create a dedicated doc in the appropriate subfolder.

---

### `docs/live/`

**Purpose:** Live state and project reference — files that change frequently as the project evolves.

**What belongs here:**
- Current feature status and phase progress
- File ownership registry
- Cross-feature runtime issues and recovery steps

**What it contains:**
- `current-status.md` — Live project state: implemented features, next steps, verification baseline
- `file-map.md` — File ownership and responsibility registry (updated when files are added)
- `troubleshooting.md` — Cross-feature runtime issues organized by symptom/subsystem

**Rules:**
- These files are updated as the project evolves — they are living documents.
- `current-status.md` is the source of truth for feature status, not architecture docs.
- `file-map.md` must be updated when new TS/TSX files are created.
- `troubleshooting.md` is for cross-cutting runtime issues; feature-specific debug info goes in the feature's architecture or system guide.
- Do not create new files directly in `docs/` root — use subfolders.

---

### `docs/architecture/`

**Purpose:** Canonical technical guides — the single source of truth for a subsystem's design, data model, and behavior rules.

**What belongs here:**
- Architecture decision records (ADR) for major subsystems
- Data models and IPC contracts
- Coordination models between major components
- File-level architecture (what each file does, why it exists)

**Rules:**
- Only one file per subsystem (no duplicates across architecture/).
- Keep these files stable — they are reference documents, not status trackers.
- If the implementation diverges from the architecture guide, update the guide first.
- Do not put status bullets or "in progress" content here.

---

### `docs/flows/`

**Purpose:** Trigger-oriented execution guides — what happens when a user or system action occurs.

**What belongs here:**
- End-to-end flow walkthroughs for concrete actions
- Debug-oriented sequences such as "type in editor", "switch pane", "save document", "handle external file change"
- Ordered mappings from trigger → entry point → state reads/writes → side effects

**Rules:**
- Flows describe behavior from the perspective of an action, not from the perspective of a subsystem.
- Prefer concise operational structure over long design prose.
- A flow can reference architecture docs for invariants, but should not restate the whole subsystem design.
- If you are asking "when this happens, what runs next?", the answer belongs here.

---

### `docs/spec/`

**Purpose:** Feature specifications — what the system should do from the user's perspective.

**What belongs here:**
- User-facing feature behavior (what the user can do)
- Acceptance criteria with examples
- Input/output contracts (API shapes, frontmatter schemas)
- Edge cases and boundary conditions

**Rules:**
- Specs describe intended behavior, not implementation details.
- Each spec has a paired implementation plan in `plan/` (when active) or `plan/done/` (when complete).
- Do not mix specification with implementation notes — use separate documents.
- Acceptance criteria go in the spec, not in the implementation plan.

---

### `docs/plan/`

**Purpose:** Active implementation plans — work that is in progress or planned but not yet started.

**What belongs here:**
- Implementation guides for in-flight features
- Execution sequences and slice breakdowns
- File-to-edit mappings for a specific feature
- Status tracking for workstreams within a phase

**Rules:**
- When a plan is finished, move it to `plan/done/` and update all doc references.
- Plans may reference but should not restate content from `architecture/` or `spec/`.
- Status lines must be accurate — update when a workstream completes.
- Next steps ("Current high-value next tasks") belong in `current-status.md`, not in plans.

---

### `docs/plan/done/`

**Purpose:** Archive of completed implementation plans that are no longer active.

**What belongs here:**
- Finished implementation plans
- Completed system guides and debug playbooks
- Phase closure checklists

**Rules:**
- Move plans here when all acceptance criteria are met and quality gates pass.
- Update `plan/done/README.md` index when adding a new archived plan.
- Update all doc references that point to the plan (typically in `START-HERE.md`, `current-status.md`, and `phase-N-detailed-plan.md`).
- Do not edit archived plans — they are historical records.
- If an archived feature needs new work, create a new plan in `docs/plan/` and reference the archived one.

---

### `docs/lessons-learned/`

**Purpose:** Effective strategies, counter-intuitive facts, and patterns worth remembering — not a bug log. Knowledge that helps future development avoid the same wrong turns.

**What belongs here:**
- Strategies that seemed right but turned out to be wrong or suboptimal
- Counter-intuitive facts about libraries or platform behavior (Quill, Electron, PDF libs, etc.)
- Patterns that proved effective and worth formalizing
- Workarounds for external dependency behavior with the underlying reason

**Rules:**
- Create an entry when something counter-intuitive or effective was discovered, not just when a bug was fixed.
- Entry format: what applies to future work, not what broke and how it was fixed.
- Filename should describe the pattern or fact, not the bug (e.g., `quill-bounds-always-relative-to-container.md`).
- Keep entries short — one file per insight.
- Do not mix lessons with implementation plans or specs.

---

## General Rules

### When to create a new doc
- When content doesn't fit any existing file's scope
- When content grows beyond 2-3 paragraphs in a reference document
- When a counter-intuitive fact or effective strategy is discovered (add to `lessons-learned/`)
- When implementation of a feature starts (create plan in `plan/`)
- When a subsystem grows beyond 3 files with no architecture doc (create in `architecture/`)

### When NOT to create a new doc
- When existing docs already cover the topic (reference instead)
- When the content is status updates (belongs in `current-status.md`)
- When the content is a duplicate (merge or reference)

### Link integrity
- When moving a doc, update all references in other docs
- When a plan completes, move it to `plan/done/` and update references
- Broken links should be fixed before committing

### Content ownership
| Content type | Where it lives | Who updates it |
|---|---|---|
| Feature spec | `spec/` | Before implementation |
| Implementation plan | `plan/` | During implementation |
| Technical architecture | `architecture/` | When design is finalized |
| Trigger-oriented flow guide | `flows/` | When a behavior path becomes hard to follow |
| Counter-intuitive fact / effective strategy | `lessons-learned/` | After discovery |
| Live status | `live/current-status.md` | When state changes |
| Entry point | `START-HERE.md` | When docs structure changes |
| Folder index | Each subfolder has `README.md` | When files are added/moved |
