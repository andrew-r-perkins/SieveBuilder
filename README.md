# SieveBuilder

A visual drag-and-drop editor for [Sieve](https://www.rfc-editor.org/rfc/rfc5228) email filter scripts.

Build complex email filters without writing code — then export ready-to-use `.sieve` files.

![SieveBuilder screenshot](sieve-builder/src/assets/ScreenShot.jpg)

---

## Features

- **Visual block editor** — drag action blocks and if/elsif/else containers onto a canvas
- **Comments** — insert hash (`#`) or bracket (`/* */`) comments anywhere; click to edit, toggle style, drag to reorder
- **Live preview** — the generated Sieve script updates in real time as you build
- **Import** — paste or load an existing `.sieve` file; unsupported constructs are flagged with a warning
- **Export** — download a `.sieve` file with `require` auto-generated from the actions you've used
- **Undo / redo** — full 100-step history (Ctrl+Z / Ctrl+Shift+Z)
- **Real-time validation** — inline error badges highlight misconfigured blocks
- **Drag-to-reorder** — blocks can be moved within a container or dragged into a different one (including into and out of if-block bodies)
- **Collapse / expand** — if blocks can be collapsed to keep the canvas tidy
- **Client-side only** — nothing leaves your browser; no backend, no accounts

---

## Supported Sieve actions

| Action | RFC / extension |
|---|---|
| `keep` | RFC 5228 |
| `discard` | RFC 5228 |
| `stop` | RFC 5228 |
| `redirect` | RFC 5228 |
| `fileinto` | RFC 5228 + `fileinto` extension |
| `reject` / `ereject` | RFC 5429 |
| `vacation` | RFC 5230 |
| `set` | RFC 5229 (variables) |

## Supported Sieve tests

`address`, `header`, `size`, `exists`, `true`, `false`, `allof`, `anyof`, `not`

Match types: `:is`, `:contains`, `:matches`, `:regex`, `:value`, `:count`

---

## Getting started

```bash
git clone https://github.com/andrew-r-perkins/SieveBuilder.git
cd SieveBuilder/sieve-builder
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

---

## Tech stack

| Concern | Library |
|---|---|
| UI framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| State management | Zustand 5 + Immer |
| Drag and drop | dnd-kit |
| Split pane | allotment |
| Sieve parser | Hand-written recursive descent (no dependencies) |

---

## Project structure

```
sieve-builder/src/
  types/          # Sieve AST TypeScript types (single source of truth)
  store/          # Zustand store + pure tree-mutation actions
  parser/         # Tokenizer + recursive descent parser
  generator/      # AST → .sieve string + require collector
  validator/      # Real-time validation rules
  components/
    blocks/       # Canvas, IfBlock, ActionBlock, CommentBlock, BodyList
    editors/      # ConditionEditor, ActionEditor
    layout/       # Toolbar, SplitLayout, PreviewPane, ValidationPanel
  hooks/          # useUndo, useValidation, useGenerator
```

---

## License

MIT
