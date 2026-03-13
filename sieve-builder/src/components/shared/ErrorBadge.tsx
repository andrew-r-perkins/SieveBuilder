import type { ValidationError } from '@/types/errors';

export function ErrorBadge({ errors }: { errors: ValidationError[] }) {
  if (errors.length === 0) return null;
  const hasError = errors.some(e => e.severity === 'error');
  return (
    <span
      title={errors.map(e => e.message).join('\n')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        borderRadius: '50%',
        fontSize: 11,
        fontWeight: 700,
        background: hasError ? 'var(--red)' : 'var(--yellow)',
        color: '#1e1e2e',
        flexShrink: 0,
        cursor: 'help',
      }}
    >
      {errors.length}
    </span>
  );
}
