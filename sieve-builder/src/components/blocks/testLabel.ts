import type { TestNode } from '@/types/sieve';

export function testLabel(test: TestNode): string {
  switch (test.kind) {
    case 'true':    return 'always (true)';
    case 'false':   return 'never (false)';
    case 'exists':  return `header exists: ${test.headers.join(', ')}`;
    case 'size':    return `size ${test.comparison} ${formatBytes(test.bytes)}`;
    case 'address': return `address ${test.addressPart} ${test.matchType} ${listLabel(test.headers)} → ${listLabel(test.keys)}`;
    case 'header':  return `header ${test.matchType} ${listLabel(test.headers)} → ${listLabel(test.keys)}`;
    case 'not':     return `NOT (${testLabel(test.test)})`;
    case 'allof':   return `ALL of (${test.tests.map(testLabel).join('; ')})`;
    case 'anyof':   return `ANY of (${test.tests.map(testLabel).join('; ')})`;
  }
}

function listLabel(values: string[]): string {
  if (values.length === 0) return '—';
  if (values.length === 1) return `"${values[0]}"`;
  return `[${values.map(v => `"${v}"`).join(', ')}]`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${bytes / 1_000_000}M`;
  if (bytes >= 1_000) return `${bytes / 1_000}K`;
  return `${bytes}`;
}
