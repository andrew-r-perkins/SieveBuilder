# SieveBuilder — Requirements Document

## 1. Overview
A locally-run web application for visually creating, editing, and exporting Sieve email filter scripts (RFC 5228 + common extensions). The visual editor uses a nested-container block model and produces valid `.sieve` files as output.

---

## 2. Users
- Power users who know Sieve and want to work faster
- Non-technical email admins who need to manage filter rules without writing code

---

## 3. Platform & Tech Stack
- Runs locally as a web application
- Modern evergreen browsers only (Chrome, Firefox, Edge, Safari — current versions)
- **Frontend**: React
- **Canvas/editor**: React Flow (`@xyflow/react`)
- No backend required; all processing client-side

---

## 4. Sieve Language Support

**RFC 5228 base spec:**
- Control: `if`, `elsif`, `else`, `stop`, `require`
- Tests: `address`, `header`, `size`, `exists`, `true`, `false`, `allof`, `anyof`, `not`
- Actions: `keep`, `discard`, `redirect`, `fileinto`
- Match types: `:is`, `:contains`, `:matches`
- Comparators: `i;octet`, `i;ascii-casemap`
- Address parts: `:localpart`, `:domain`, `:all`

**Extensions supported:**
- `reject` / `ereject`
- `vacation`
- `variables`
- `relational`
- `regex`

**`require` management**: auto-generated based on blocks used; not a manual block.

---

## 5. Visual Editor

### Block model
- Scripts are represented as a **vertical sequence of top-level blocks**
- Each `if/elsif/else` group is a **collapsible nested container**:
  - Header row shows the condition(s)
  - Body contains child action blocks and/or nested `if` containers
  - `elsif` and `else` are attached sub-containers of the parent `if`
- Leaf blocks represent individual actions (`fileinto`, `redirect`, `discard`, `keep`, `stop`, `redirect`, `reject`, `vacation`)
- Blocks can be **dragged to reorder** within their parent container
- Blocks can be **dragged into or out of** `if` containers to restructure nesting

### Navigation
- Top-to-bottom layout, fixed canvas area with vertical scrolling
- `if` blocks are collapsible to manage complexity of long scripts

### Editing interactions
- Click a block to open an inline property panel (edit test type, match type, values, etc.)
- Add block via toolbar or context menu ("Add condition", "Add action", "Add if")
- Delete block via context menu or keyboard shortcut

### Undo/Redo
- Full undo/redo stack for all editor actions

---

## 6. Split-Pane Live Preview
- The UI is split: **visual editor (left)** | **raw Sieve text (right)**
- The Sieve pane updates live as the visual editor changes
- The Sieve pane is **read-only** (edits flow from visual → text, not text → visual)

---

## 7. Import (Bidirectional)
- User can load an existing `.sieve` file
- **Best-effort parsing**: common RFC 5228 + supported extension constructs are parsed into visual blocks
- Constructs that cannot be represented visually (unsupported extensions, unusual syntax) are **rejected** — a visible warning banner lists exactly what could not be parsed and the import is aborted
- Successful import renders the full script in the visual editor

---

## 8. Export
- **Download button** generates and downloads the `.sieve` file
- `require` statements are auto-generated based on extensions used in the script
- One script per session

---

## 9. Validation
- Real-time validation as the user edits
- Errors surfaced inline (on the offending block) and in a summary panel
- Examples of caught errors:
  - Missing required arguments on a block
  - `vacation` used without required parameters
  - Invalid regex pattern
  - Conflicting actions (e.g. `keep` and `discard` in same branch)

---

## 10. Out of Scope (v1)
- Multi-script library / script management
- Text-to-visual editing (Sieve pane is read-only)
- Backend / server integration
- Authentication or user accounts
- Extensions beyond the listed six
