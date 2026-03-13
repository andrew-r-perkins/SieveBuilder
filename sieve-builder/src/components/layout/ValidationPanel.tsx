import { useValidation } from '@/hooks/useValidation';

export function ValidationPanel() {
  const { errors } = useValidation();
  if (errors.length === 0) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        {errors.length} validation {errors.length === 1 ? 'issue' : 'issues'}
      </div>
      <div style={styles.list}>
        {errors.map((err, i) => (
          <div key={i} style={{ ...styles.item, ...(err.severity === 'error' ? styles.errorItem : styles.warnItem) }}>
            <span style={styles.icon}>{err.severity === 'error' ? '✕' : '⚠'}</span>
            {err.message}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: 'var(--bg-surface)',
    borderTop: '1px solid var(--border)',
    maxHeight: 140,
    overflow: 'auto',
    flexShrink: 0,
  },
  header: {
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    borderBottom: '1px solid var(--border)',
  },
  list: { padding: '4px 0' },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '3px 12px',
    fontSize: 13,
  },
  errorItem: { color: 'var(--red)' },
  warnItem: { color: 'var(--yellow)' },
  icon: { fontWeight: 700, flexShrink: 0 },
};
