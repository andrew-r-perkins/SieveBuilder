import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ActionBlock as ActionBlockType } from '@/types/sieve';
import { useScriptStore } from '@/store/useScriptStore';
import { useValidation } from '@/hooks/useValidation';
import { ActionEditor } from '@/components/editors/ActionEditor';
import { ErrorBadge } from '@/components/shared/ErrorBadge';
import { actionLabel, actionColor } from './actionLabel';

interface Props {
  block: ActionBlockType;
}

export function ActionBlock({ block }: Props) {
  const [expanded, setExpanded] = useState(false);
  const doRemoveBlock = useScriptStore(s => s.doRemoveBlock);
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

  const color = actionColor(block.kind);

  return (
    <div ref={setNodeRef} style={{ ...style, ...styles.wrapper }}>
      <div style={{ ...styles.header, borderLeftColor: color }}>
        {/* Drag handle */}
        <span {...attributes} {...listeners} style={styles.dragHandle} title="Drag to reorder">⠿</span>

        {/* Label */}
        <span style={styles.label}>{actionLabel(block)}</span>

        {/* Badges */}
        <ErrorBadge errors={errors} />

        {/* Toggle edit */}
        <button onClick={() => setExpanded(e => !e)} style={styles.iconBtn} title="Edit">
          {expanded ? '▲' : '✎'}
        </button>

        {/* Delete */}
        <button onClick={() => doRemoveBlock(block.id)} style={styles.deleteBtn} title="Delete">×</button>
      </div>

      {expanded && (
        <ActionEditor block={block} onClose={() => setExpanded(false)} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderLeft: '3px solid var(--accent)',
    background: 'var(--bg-raised)',
  },
  dragHandle: {
    cursor: 'grab',
    color: 'var(--text-muted)',
    fontSize: 16,
    flexShrink: 0,
    userSelect: 'none',
    touchAction: 'none',
  },
  label: {
    flex: 1,
    fontSize: 13,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--text)',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 14,
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
};
