import type { ActionBlock } from '@/types/sieve';

export function actionLabel(block: ActionBlock): string {
  switch (block.kind) {
    case 'keep':    return 'keep (deliver to inbox)';
    case 'discard': return 'discard (silently delete)';
    case 'stop':    return 'stop processing';
    case 'redirect': return `redirect${block.copy ? ' (copy)' : ''} → ${block.address || '(no address)'}`;
    case 'fileinto': return `file into${block.copy ? ' (copy)' : ''}: ${block.mailbox || '(no mailbox)'}`;
    case 'reject':   return `reject: "${block.message || '(no message)'}"`;
    case 'ereject':  return `ereject: "${block.message || '(no message)'}"`;
    case 'vacation': return `vacation: "${block.subject || '(no subject)'}"`;
    case 'set':      return `set $${block.name || '(no name)'} = "${block.value}"`;
  }
}

export function actionColor(kind: ActionBlock['kind']): string {
  switch (kind) {
    case 'keep':     return '#a6e3a1';  // green
    case 'discard':  return '#f38ba8';  // red
    case 'stop':     return '#f38ba8';
    case 'redirect': return '#89b4fa';  // blue
    case 'fileinto': return '#89dceb';  // teal
    case 'reject':
    case 'ereject':  return '#f38ba8';
    case 'vacation': return '#cba6f7';  // mauve
    case 'set':      return '#f9e2af';  // yellow
  }
}
