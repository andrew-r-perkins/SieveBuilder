# SieveBuilder — Claude instructions

## Project overview

Visual drag-and-drop editor for Sieve email filter scripts (RFC 5228 + extensions).
Client-side only React app. No backend, no auth.

The app lives in `sieve-builder/`. All work happens there.

## Dev server

```bash
cd sieve-builder && npm run dev   # port 5173 (or 5174/5175 if busy)
```

Use `mcp__Claude_Preview__preview_start` or the launch config — do NOT use Bash to start the server.

## Architecture

- **Visual model**: nested containers — if/elsif/else are collapsible block containers; actions and comments are leaf blocks
- **State**: Zustand 5 + Immer, manual undo/redo history stack (`past`/`future` arrays in the store). Do NOT use zundo — it was removed due to Zustand 5 incompatibility.
- **Drag-and-drop**: dnd-kit only. Each `BodyList` registers a `useDroppable` with id `blockId + ':body'` for if-block bodies (NOT `blockId` — that would collide with the sortable item). Custom `deepestDroppable` collision detection in `ScriptCanvas.tsx` handles nested droppables.
- **Split pane**: allotment
- **No React Flow** — was considered and rejected; plain vertical layout instead

## Key files

| File | Purpose |
|---|---|
| `src/types/sieve.ts` | Complete AST type definitions — edit this first for any new block/test types |
| `src/store/useScriptStore.ts` | Zustand store with manual undo/redo |
| `src/store/actions.ts` | Pure Immer tree mutations (addBlock, removeBlock, moveBlock, etc.) |
| `src/generator/generator.ts` | AST → .sieve string |
| `src/generator/requireCollector.ts` | Derives `require []` from tree |
| `src/parser/parser.ts` | Recursive descent Sieve parser |
| `src/validator/validator.ts` | Pure validation function |
| `src/components/blocks/ScriptCanvas.tsx` | DndContext root + collision detection |
| `src/components/blocks/BodyList.tsx` | SortableContext + useDroppable per container |
| `src/components/blocks/IfBlock.tsx` | Collapsible if/elsif/else container |
| `src/components/blocks/ActionBlock.tsx` | Leaf action block |
| `src/components/blocks/CommentBlock.tsx` | Leaf comment block |

## Known pitfalls

- **BodyList droppable ID**: always `blockId + ':body'` for if-block bodies — never bare `blockId`
- **Snapshot before set()**: in the store, always call `get()` BEFORE entering `set()` to snapshot state. `structuredClone` inside an Immer callback throws a `DataCloneError`.
- **zundo removed**: undo/redo is manual (`past`/`future` arrays). Don't re-add zundo.
- **`collapsed` is local state**: `IfBlock.collapsed` is `useState` in the component, not tracked by undo.
- **`@codemirror/lang-plaintext` does not exist** — preview uses a plain `<pre>` tag.
- **Immer + Zustand 5**: use `import { immer } from 'zustand/middleware/immer'`

## Adding a new block type

1. Add the type to `src/types/sieve.ts` (add to `BodyBlock` / `TopLevelBlock` union)
2. Add `isXxxBlock` type guard in `src/types/sieve.ts`
3. Handle it in `src/generator/generator.ts`
4. Handle it in `src/parser/parser.ts`
5. Handle it in `src/validator/validator.ts` (if it has validatable fields)
6. Handle it in `src/generator/requireCollector.ts` (if it needs a `require`)
7. Create `src/components/blocks/XxxBlock.tsx`
8. Register it in `src/components/blocks/BodyList.tsx`
9. Add an editor in `src/components/editors/` if needed

## TypeScript

Always run `npx tsc --noEmit` from `sieve-builder/` to verify before committing.
