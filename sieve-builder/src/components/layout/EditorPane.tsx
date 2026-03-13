import { ScriptCanvas } from '@/components/blocks/ScriptCanvas';
import { ValidationPanel } from './ValidationPanel';

export function EditorPane() {
  return (
    <div style={styles.pane}>
      <div style={styles.header}>Visual Editor</div>
      <ScriptCanvas />
      <ValidationPanel />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pane: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    background: 'var(--bg-base)',
  },
  header: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    background: 'var(--bg-surface)',
  },
};
