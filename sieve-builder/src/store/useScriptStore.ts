import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { SieveScript, NodeId, TopLevelBlock, BodyBlock } from '../types/sieve';
import type { ParseError } from '../types/errors';
import {
  emptyScript, addBlock, removeBlock, moveBlock,
  updateBlock, addBranch, removeBranch, toggleCollapsed,
} from './actions';

const HISTORY_LIMIT = 100;

/** Deep-clone a SieveScript using JSON round-trip (safe on frozen/plain objects). */
function cloneScript(s: SieveScript): SieveScript {
  return JSON.parse(JSON.stringify(s)) as SieveScript;
}

/** Produce a new past array with `snap` appended, respecting the limit. */
function pushPast(past: SieveScript[], snap: SieveScript): SieveScript[] {
  return [...past.slice(-(HISTORY_LIMIT - 1)), snap];
}

interface ScriptState {
  // ── Undoable script ────────────────────────────────────────────────────────
  script: SieveScript;

  // ── Undo/redo history ──────────────────────────────────────────────────────
  past: SieveScript[];
  future: SieveScript[];

  // ── UI state (not tracked by undo) ─────────────────────────────────────────
  selectedBlockId: NodeId | null;
  importErrors: ParseError[];

  // ── Actions ────────────────────────────────────────────────────────────────
  undo: () => void;
  redo: () => void;
  setScript: (script: SieveScript) => void;
  applyAction: (mutator: (draft: SieveScript) => void) => void;
  selectBlock: (id: NodeId | null) => void;
  setImportErrors: (errors: ParseError[]) => void;
  clearImportErrors: () => void;

  doAddBlock: (containerId: NodeId, index: number, block: TopLevelBlock | BodyBlock) => void;
  doRemoveBlock: (blockId: NodeId) => void;
  doMoveBlock: (blockId: NodeId, targetContainerId: NodeId, targetIndex: number) => void;
  doUpdateBlock: (blockId: NodeId, patch: Partial<TopLevelBlock | BodyBlock>) => void;
  doAddBranch: (ifBlockId: NodeId, kind: 'elsif' | 'else') => void;
  doRemoveBranch: (branchId: NodeId) => void;
  doToggleCollapsed: (ifBlockId: NodeId) => void;
  doNewScript: () => void;
}

export const useScriptStore = create<ScriptState>()(
  immer<ScriptState>((set, get) => ({
    script: emptyScript(),
    past: [],
    future: [],
    selectedBlockId: null,
    importErrors: [],

    undo: () => {
      const { past, script, future } = get();
      if (past.length === 0) return;
      const prev = past[past.length - 1];
      const snap = cloneScript(script);
      set((state) => {
        state.script = prev;
        state.past = past.slice(0, -1);
        state.future = [snap, ...future];
      });
    },

    redo: () => {
      const { past, script, future } = get();
      if (future.length === 0) return;
      const next = future[0];
      const snap = cloneScript(script);
      set((state) => {
        state.script = next;
        state.past = [...past, snap];
        state.future = future.slice(1);
      });
    },

    setScript: (script) => {
      const snap = cloneScript(get().script);
      set((state) => {
        state.past = pushPast(get().past, snap);
        state.future = [];
        state.script = script;
      });
    },

    applyAction: (mutator) => {
      const snap = cloneScript(get().script);
      set((state) => {
        state.past = pushPast(get().past, snap);
        state.future = [];
        mutator(state.script);
      });
    },

    selectBlock: (id) => set((state) => { state.selectedBlockId = id; }),
    setImportErrors: (errors) => set((state) => { state.importErrors = errors; }),
    clearImportErrors: () => set((state) => { state.importErrors = []; }),

    doAddBlock: (containerId, index, block) => {
      const snap = cloneScript(get().script);
      const past = get().past;
      set((state) => {
        state.past = pushPast(past, snap);
        state.future = [];
        addBlock(state.script, containerId, index, block);
      });
    },

    doRemoveBlock: (blockId) => {
      const snap = cloneScript(get().script);
      const past = get().past;
      set((state) => {
        state.past = pushPast(past, snap);
        state.future = [];
        removeBlock(state.script, blockId);
      });
    },

    doMoveBlock: (blockId, targetContainerId, targetIndex) => {
      const snap = cloneScript(get().script);
      const past = get().past;
      set((state) => {
        state.past = pushPast(past, snap);
        state.future = [];
        moveBlock(state.script, blockId, targetContainerId, targetIndex);
      });
    },

    doUpdateBlock: (blockId, patch) => {
      const snap = cloneScript(get().script);
      const past = get().past;
      set((state) => {
        state.past = pushPast(past, snap);
        state.future = [];
        updateBlock(state.script, blockId, patch as TopLevelBlock | BodyBlock);
      });
    },

    doAddBranch: (ifBlockId, kind) => {
      const snap = cloneScript(get().script);
      const past = get().past;
      set((state) => {
        state.past = pushPast(past, snap);
        state.future = [];
        addBranch(state.script, ifBlockId, kind);
      });
    },

    doRemoveBranch: (branchId) => {
      const snap = cloneScript(get().script);
      const past = get().past;
      set((state) => {
        state.past = pushPast(past, snap);
        state.future = [];
        removeBranch(state.script, branchId);
      });
    },

    doToggleCollapsed: (ifBlockId) => set((state) => {
      // Collapse/expand is intentionally not undoable
      toggleCollapsed(state.script, ifBlockId);
    }),

    doNewScript: () => set((state) => {
      state.script = emptyScript();
      state.past = [];
      state.future = [];
      state.selectedBlockId = null;
    }),
  }))
);

// ── Selector helpers ───────────────────────────────────────────────────────
export const selectCanUndo = (s: ScriptState) => s.past.length > 0;
export const selectCanRedo = (s: ScriptState) => s.future.length > 0;

