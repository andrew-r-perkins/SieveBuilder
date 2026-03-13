import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { BodyBlock, TopLevelBlock, NodeId } from '@/types/sieve';
import { isIfBlock } from '@/types/sieve';
import { ActionBlock } from './ActionBlock';
import { IfBlock } from './IfBlock';
import { useScriptStore } from '@/store/useScriptStore';
import { newId } from '@/utils/idgen';
import type { ActionBlock as ActionBlockType, IfBlock as IfBlockType } from '@/types/sieve';

interface Props {
  containerId: NodeId;
  blocks: (BodyBlock | TopLevelBlock)[];
  indent?: number;
}

export function BodyList({ containerId, blocks, indent = 0 }: Props) {
  const { doAddBlock } = useScriptStore();
  const { setNodeRef, isOver } = useDroppable({ id: containerId });

  function addAction() {
    const block: ActionBlockType = { id: newId(), kind: 'keep' };
    doAddBlock(containerId, blocks.length, block);
  }

  function addIf() {
    const block: IfBlockType = {
      id: newId(),
      kind: 'if',
      test: { id: newId(), kind: 'true' },
      body: [],
      branches: [],
      collapsed: false,
    };
    doAddBlock(containerId, blocks.length, block);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.list,
        marginLeft: indent,
        outline: isOver ? '2px dashed var(--accent)' : 'none',
        minHeight: 32,
      }}
    >
      <SortableContext
        items={blocks.map(b => b.id)}
        strategy={verticalListSortingStrategy}
      >
        {blocks.map(block =>
          isIfBlock(block)
            ? <IfBlock key={block.id} block={block} />
            : <ActionBlock key={block.id} block={block} />
        )}
      </SortableContext>

      {blocks.length === 0 && (
        <div style={styles.empty}>drop blocks here</div>
      )}

      <div style={styles.addRow}>
        <button onClick={addAction} style={styles.addBtn}>+ action</button>
        <button onClick={addIf} style={styles.addBtn}>+ if</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 4,
    padding: '4px 0',
  },
  empty: {
    color: 'var(--text-muted)',
    fontSize: 12,
    textAlign: 'center',
    padding: '8px 0',
    fontStyle: 'italic',
  },
  addRow: {
    display: 'flex',
    gap: 6,
    paddingTop: 4,
  },
  addBtn: {
    padding: '2px 8px',
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px dashed var(--border)',
    borderRadius: 4,
    fontSize: 12,
  },
};
