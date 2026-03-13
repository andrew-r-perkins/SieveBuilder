import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  closestCenter,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, CollisionDetection } from '@dnd-kit/core';

/** Pick the smallest (deepest/most-specific) droppable the pointer is over.
 *  Excludes the active (dragged) item so it can't collide with itself.
 *  Falls back to closestCenter when the pointer is outside all droppables. */
const deepestDroppable: CollisionDetection = (args) => {
  // Strip the active item from candidates — its animated position can overlap the pointer
  const filtered = {
    ...args,
    droppableContainers: args.droppableContainers.filter(c => c.id !== args.active.id),
  };
  const hits = pointerWithin(filtered);
  if (hits.length === 0) return closestCenter(filtered);
  if (hits.length === 1) return hits;
  // Sort by area ascending — smallest = deepest in the nesting tree
  return [...hits].sort((a, b) => {
    const ra = args.droppableRects.get(a.id);
    const rb = args.droppableRects.get(b.id);
    if (!ra || !rb) return 0;
    return ra.width * ra.height - rb.width * rb.height;
  }).slice(0, 1);
};
import { useState } from 'react';
import { useScriptStore } from '@/store/useScriptStore';
import { BodyList } from './BodyList';

export function ScriptCanvas() {
  const { script, doMoveBlock, importErrors, clearImportErrors } = useScriptStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const draggedId = String(active.id);
    const overId = String(over.id);
    if (draggedId === overId) return;

    // Determine target container: if overId is a container id use it directly,
    // otherwise find which container the overId block belongs to
    const targetContainerId = resolveContainer(script, overId);
    if (!targetContainerId) return;

    // Compute target index from current container contents
    const targetBody = getContainerBlocks(script, targetContainerId);
    if (!targetBody) return;

    const overIndex = targetBody.findIndex(b => b.id === overId);
    const targetIndex = overIndex === -1 ? targetBody.length : overIndex;

    doMoveBlock(draggedId, targetContainerId, targetIndex);
  }

  return (
    <div style={styles.canvas}>
      {importErrors.length > 0 && (
        <div style={styles.importBanner}>
          <strong>Import failed</strong> — the following constructs could not be parsed:
          <ul style={{ margin: '4px 0 0 16px' }}>
            {importErrors.map((e, i) => (
              <li key={i} style={{ fontSize: 13 }}>
                Line {e.line}:{e.col} — {e.message}
                {e.construct ? ` (${e.construct})` : ''}
              </li>
            ))}
          </ul>
          <button onClick={clearImportErrors} style={styles.bannerClose}>Dismiss</button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={deepestDroppable} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <BodyList
          containerId={script.id}
          blocks={script.blocks}
        />
        <DragOverlay>
          {activeId ? <DragOverlayItem /> : null}
        </DragOverlay>
      </DndContext>

      {script.blocks.length === 0 && importErrors.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📬</div>
          <div style={styles.emptyTitle}>No rules yet</div>
          <div style={styles.emptyHint}>
            Use <strong>+ Action</strong> or <strong>+ If block</strong> in the toolbar to start building your filter.
          </div>
        </div>
      )}
    </div>
  );
}

function DragOverlayItem() {
  return (
    <div style={{
      padding: '6px 12px',
      background: 'var(--bg-raised)',
      border: '1px solid var(--accent)',
      borderRadius: 6,
      fontSize: 13,
      color: 'var(--text-muted)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    }}>
      Moving block...
    </div>
  );
}

// ─── Helpers to resolve which container a block or container id belongs to ────

import type { SieveScript, BodyBlock, TopLevelBlock, IfBlock } from '@/types/sieve';
import { isIfBlock } from '@/types/sieve';

function resolveContainer(script: SieveScript, overId: string): string | null {
  // Is overId the script root?
  if (overId === script.id) return script.id;

  // Is overId a top-level block?
  if (script.blocks.some(b => b.id === overId)) return script.id;

  // Search recursively
  for (const block of script.blocks) {
    if (isIfBlock(block)) {
      const result = resolveContainerInIf(block, overId);
      if (result) return result;
    }
  }
  return null;
}

function resolveContainerInIf(ifBlock: IfBlock, overId: string): string | null {
  const bodyId = ifBlock.id + ':body';

  // overId IS the body droppable of this if block
  if (overId === bodyId) return bodyId;

  // overId is a direct child of ifBlock.body → body is the container
  if (ifBlock.body.some(b => b.id === overId)) return bodyId;

  // Is overId a branch id?
  for (const branch of ifBlock.branches) {
    if (branch.id === overId) return branch.id;
    if (branch.body.some(b => b.id === overId)) return branch.id;
    for (const b of branch.body) {
      if (isIfBlock(b)) {
        const result = resolveContainerInIf(b, overId);
        if (result) return result;
      }
    }
  }

  // Recurse into nested ifs in body
  for (const b of ifBlock.body) {
    if (isIfBlock(b)) {
      const result = resolveContainerInIf(b, overId);
      if (result) return result;
    }
  }
  return null;
}

function getContainerBlocks(script: SieveScript, containerId: string): (BodyBlock | TopLevelBlock)[] | null {
  if (containerId === script.id) return script.blocks;
  for (const block of script.blocks) {
    if (isIfBlock(block)) {
      const result = getBodyInIf(block, containerId);
      if (result) return result;
    }
  }
  return null;
}

function getBodyInIf(ifBlock: IfBlock, containerId: string): BodyBlock[] | null {
  if (ifBlock.id + ':body' === containerId) return ifBlock.body;
  for (const branch of ifBlock.branches) {
    if (branch.id === containerId) return branch.body;
  }
  for (const b of ifBlock.body) {
    if (isIfBlock(b)) {
      const r = getBodyInIf(b, containerId);
      if (r) return r;
    }
  }
  for (const branch of ifBlock.branches) {
    for (const b of branch.body) {
      if (isIfBlock(b)) {
        const r = getBodyInIf(b, containerId);
        if (r) return r;
      }
    }
  }
  return null;
}

const styles: Record<string, React.CSSProperties> = {
  canvas: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    position: 'relative',
  },
  importBanner: {
    background: 'rgba(243, 139, 168, 0.12)',
    border: '1px solid var(--red)',
    borderRadius: 6,
    padding: '10px 12px',
    marginBottom: 12,
    color: 'var(--red)',
    fontSize: 13,
  },
  bannerClose: {
    marginTop: 8,
    padding: '3px 10px',
    background: 'transparent',
    border: '1px solid var(--red)',
    borderRadius: 4,
    color: 'var(--red)',
    fontSize: 12,
  },
  emptyState: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: 'var(--text-label)', marginBottom: 6 },
  emptyHint: { fontSize: 13, maxWidth: 300 },
};
