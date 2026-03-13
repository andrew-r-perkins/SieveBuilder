import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { IfBlock as IfBlockType, ElsifBlock, ElseBlock } from '@/types/sieve';
import { useScriptStore } from '@/store/useScriptStore';
import { useValidation } from '@/hooks/useValidation';
import { ConditionEditor } from '@/components/editors/ConditionEditor';
import { ErrorBadge } from '@/components/shared/ErrorBadge';
import { testLabel } from './testLabel';
import { BodyList } from './BodyList';

interface Props {
  block: IfBlockType;
}

export function IfBlock({ block }: Props) {
  const [collapsed, setCollapsed] = useState(block.collapsed);
  const [editingCondition, setEditingCondition] = useState(false);
  const { doRemoveBlock, doUpdateBlock, doAddBranch } = useScriptStore();
  const { errorsForBlock } = useValidation();
  const errors = errorsForBlock(block.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const hasElse = block.branches.some(b => b.kind === 'else');

  return (
    <div ref={setNodeRef} style={{ ...style, ...styles.wrapper }}>
      {/* IF header */}
      <div style={styles.ifHeader}>
        <span {...attributes} {...listeners} style={styles.dragHandle} title="Drag to reorder">⠿</span>
        <span style={styles.keyword}>if</span>
        <span
          style={styles.condition}
          onClick={() => setEditingCondition(e => !e)}
          title="Click to edit condition"
        >
          {testLabel(block.test)}
        </span>
        <ErrorBadge errors={errors} />
        <button onClick={() => setCollapsed(c => !c)} style={styles.iconBtn} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '▶' : '▼'}
        </button>
        <button onClick={() => doRemoveBlock(block.id)} style={styles.deleteBtn} title="Delete if block">×</button>
      </div>

      {/* Condition editor */}
      {editingCondition && !collapsed && (
        <div style={styles.condEditor}>
          <ConditionEditor
            test={block.test}
            blockId={block.id}
            onUpdate={test => {
              doUpdateBlock(block.id, { ...block, test } as IfBlockType);
            }}
          />
          <button onClick={() => setEditingCondition(false)} style={styles.doneBtn}>Done</button>
        </div>
      )}

      {/* Body */}
      {!collapsed && (
        <div style={styles.body}>
          <BodyList containerId={block.id + ':body'} blocks={block.body} indent={12} />

          {/* Branches: elsif / else */}
          {block.branches.map(branch =>
            branch.kind === 'elsif'
              ? <ElsifSection key={branch.id} branch={branch} ifBlock={block} />
              : <ElseSection key={branch.id} branch={branch} ifBlock={block} />
          )}

          {/* Add branch buttons */}
          <div style={styles.branchButtons}>
            <button onClick={() => doAddBranch(block.id, 'elsif')} style={styles.addBranchBtn}>+ elsif</button>
            {!hasElse && (
              <button onClick={() => doAddBranch(block.id, 'else')} style={styles.addBranchBtn}>+ else</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ElsifSection({ branch, ifBlock }: { branch: ElsifBlock; ifBlock: IfBlockType }) {
  const [editingCondition, setEditingCondition] = useState(false);
  const { doUpdateBlock, doRemoveBranch } = useScriptStore();
  const { errorsForBlock } = useValidation();
  const errors = errorsForBlock(branch.id);

  return (
    <div style={styles.branchWrapper}>
      <div style={styles.elsifHeader}>
        <span style={styles.keyword}>elsif</span>
        <span
          style={styles.condition}
          onClick={() => setEditingCondition(e => !e)}
          title="Click to edit condition"
        >
          {testLabel(branch.test)}
        </span>
        <ErrorBadge errors={errors} />
        <button onClick={() => doRemoveBranch(branch.id)} style={styles.deleteBtn} title="Remove elsif">×</button>
      </div>
      {editingCondition && (
        <div style={styles.condEditor}>
          <ConditionEditor
            test={branch.test}
            blockId={branch.id}
            onUpdate={test => {
              // Update the branch inside the ifBlock
              const branches = ifBlock.branches.map(b =>
                b.id === branch.id ? { ...branch, test } : b
              );
              doUpdateBlock(ifBlock.id, { ...ifBlock, branches } as IfBlockType);
            }}
          />
          <button onClick={() => setEditingCondition(false)} style={styles.doneBtn}>Done</button>
        </div>
      )}
      <BodyList containerId={branch.id} blocks={branch.body} indent={12} />
    </div>
  );
}

function ElseSection({ branch }: { branch: ElseBlock; ifBlock?: IfBlockType }) {
  const { doRemoveBranch } = useScriptStore();
  return (
    <div style={styles.branchWrapper}>
      <div style={styles.elsifHeader}>
        <span style={styles.keyword}>else</span>
        <span style={{ flex: 1 }} />
        <button onClick={() => doRemoveBranch(branch.id)} style={styles.deleteBtn} title="Remove else">×</button>
      </div>
      <BodyList containerId={branch.id} blocks={branch.body} indent={12} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  ifHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    background: 'var(--bg-raised)',
    borderLeft: '3px solid var(--accent)',
  },
  dragHandle: {
    cursor: 'grab',
    color: 'var(--text-muted)',
    fontSize: 16,
    flexShrink: 0,
    userSelect: 'none',
    touchAction: 'none',
  },
  keyword: {
    fontFamily: 'var(--mono)',
    fontWeight: 700,
    color: 'var(--accent)',
    fontSize: 13,
    flexShrink: 0,
  },
  condition: {
    flex: 1,
    fontSize: 13,
    color: 'var(--text-label)',
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 13,
    padding: '2px 4px',
    borderRadius: 3,
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--red)',
    fontSize: 16,
    padding: '2px 4px',
    borderRadius: 3,
    lineHeight: 1,
  },
  body: {
    padding: '8px 8px 6px',
  },
  branchWrapper: {
    borderTop: '1px solid var(--border)',
    paddingTop: 4,
    marginTop: 4,
  },
  elsifHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 8px',
    background: 'var(--bg-hover)',
    borderLeft: '3px solid var(--yellow)',
    marginBottom: 4,
  },
  branchButtons: {
    display: 'flex',
    gap: 6,
    marginTop: 6,
    paddingTop: 4,
    borderTop: '1px dashed var(--border)',
  },
  addBranchBtn: {
    padding: '2px 8px',
    background: 'transparent',
    color: 'var(--yellow)',
    border: '1px dashed var(--yellow)',
    borderRadius: 4,
    fontSize: 12,
  },
  condEditor: {
    padding: '10px 12px',
    background: 'var(--bg-raised)',
    borderTop: '1px solid var(--border)',
  },
  doneBtn: {
    marginTop: 8,
    padding: '4px 12px',
    background: 'var(--accent)',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 4,
    fontWeight: 600,
    fontSize: 13,
  },
};
