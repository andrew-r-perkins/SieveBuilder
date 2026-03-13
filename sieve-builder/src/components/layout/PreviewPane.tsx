import { useGenerator } from '@/hooks/useGenerator';

export function PreviewPane() {
  const sieveText = useGenerator();

  return (
    <div style={styles.pane}>
      <div style={styles.header}>Sieve Preview</div>
      <pre style={styles.pre}>{sieveText || '# (empty script)'}</pre>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pane: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    background: 'var(--bg-surface)',
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
  },
  pre: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
    margin: 0,
    fontFamily: 'var(--mono)',
    fontSize: 13,
    lineHeight: 1.6,
    color: 'var(--text)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};
