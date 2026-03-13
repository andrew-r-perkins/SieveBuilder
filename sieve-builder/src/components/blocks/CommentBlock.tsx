import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CommentBlock as CommentBlockType } from '@/types/sieve';
import { useScriptStore } from '@/store/useScriptStore';

interface Props {
  block: CommentBlockType;
}

export function CommentBlock({ block }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(block.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const doRemoveBlock = useScriptStore(s => s.doRemoveBlock);
  const doUpdateBlock = useScriptStore(s => s.doUpdateBlock);

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

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  function commitEdit() {
    doUpdateBlock(block.id, { text: draft } as Partial<CommentBlockType>);
    setEditing(false);
  }

  function toggleStyle() {
    const newStyle = block.style === 'hash' ? 'bracket' : 'hash';
    doUpdateBlock(block.id, { style: newStyle } as Partial<CommentBlockType>);
  }

  const styleLabel = block.style === 'hash' ? '#' : '/**/';

  return (
    <div ref={setNodeRef} style={{ ...style, ...styles.wrapper }}>
      <div style={styles.header}>
        {/* Drag handle */}
        <span {...attributes} {...listeners} style={styles.dragHandle} title="Drag to reorder">⠿</span>

        {/* Style toggle */}
        <button onClick={toggleStyle} style={styles.styleBtn} title={`Switch to ${block.style === 'hash' ? 'bracket' : 'hash'} comment`}>
          {styleLabel}
        </button>

        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') { setDraft(block.text); setEditing(false); }
            }}
            style={styles.textarea}
            rows={Math.max(1, draft.split('\n').length)}
            placeholder="Enter comment text…"
          />
        ) : (
          <span
            onClick={() => { setDraft(block.text); setEditing(true); }}
            style={block.text ? styles.text : styles.textPlaceholder}
            title="Click to edit"
          >
            {block.text || '(empty comment — click to edit)'}
          </span>
        )}

        {/* Delete */}
        <button onClick={() => doRemoveBlock(block.id)} style={styles.deleteBtn} title="Delete">×</button>
      </div>
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
    alignItems: 'flex-start',
    gap: 8,
    padding: '6px 8px',
    borderLeft: '3px solid #6c7086',
    background: 'var(--bg-raised)',
  },
  dragHandle: {
    cursor: 'grab',
    color: 'var(--text-muted)',
    fontSize: 16,
    flexShrink: 0,
    userSelect: 'none',
    touchAction: 'none',
    marginTop: 1,
  },
  styleBtn: {
    background: 'rgba(108, 112, 134, 0.15)',
    border: '1px solid #6c7086',
    color: '#6c7086',
    fontSize: 11,
    fontFamily: 'monospace',
    padding: '1px 5px',
    borderRadius: 3,
    flexShrink: 0,
    cursor: 'pointer',
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#6c7086',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    cursor: 'text',
  },
  textPlaceholder: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
    color: 'var(--text-muted)',
    cursor: 'text',
  },
  textarea: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#6c7086',
    background: 'transparent',
    border: '1px solid #6c7086',
    borderRadius: 3,
    padding: '2px 4px',
    resize: 'vertical',
    outline: 'none',
    minHeight: 22,
    width: '100%',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--red)',
    fontSize: 16,
    padding: '2px 4px',
    borderRadius: 3,
    lineHeight: 1,
    flexShrink: 0,
    marginTop: 0,
  },
};
