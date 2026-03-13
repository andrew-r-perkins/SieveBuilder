import type {
  SieveScript, TopLevelBlock, BodyBlock, IfBlock,
  ElsifBlock, ElseBlock, TestNode, ActionBlock,
} from '../types/sieve';
import { collectRequires } from './requireCollector';

export function generateSieve(script: SieveScript): string {
  const lines: string[] = [];

  const requires = collectRequires(script);
  if (requires.length > 0) {
    if (requires.length === 1) {
      lines.push(`require "${requires[0]}";`);
    } else {
      lines.push(`require [${requires.map(r => `"${r}"`).join(', ')}];`);
    }
    lines.push('');
  }

  for (const block of script.blocks) {
    lines.push(...emitBlock(block, 0));
  }

  return lines.join('\n');
}

// ─── Block emission ───────────────────────────────────────────────────────────

function emitBlock(block: TopLevelBlock | BodyBlock, depth: number): string[] {
  if (block.kind === 'if') return emitIfBlock(block, depth);
  return emitActionBlock(block, depth);
}

function indent(depth: number): string {
  return '    '.repeat(depth);
}

function emitIfBlock(block: IfBlock, depth: number): string[] {
  const lines: string[] = [];
  const ind = indent(depth);

  lines.push(`${ind}if ${emitTest(block.test)} {`);
  for (const b of block.body) {
    lines.push(...emitBlock(b, depth + 1));
  }

  for (const branch of block.branches) {
    if (branch.kind === 'elsif') {
      lines.push(...emitElsif(branch, depth));
    } else {
      lines.push(...emitElse(branch, depth));
    }
  }

  lines.push(`${ind}}`);
  return lines;
}

function emitElsif(branch: ElsifBlock, depth: number): string[] {
  const lines: string[] = [];
  const ind = indent(depth);
  // Replace last "}" with "} elsif ..." — we append directly
  lines.push(`${ind}} elsif ${emitTest(branch.test)} {`);
  for (const b of branch.body) {
    lines.push(...emitBlock(b, depth + 1));
  }
  return lines;
}

function emitElse(branch: ElseBlock, depth: number): string[] {
  const lines: string[] = [];
  const ind = indent(depth);
  lines.push(`${ind}} else {`);
  for (const b of branch.body) {
    lines.push(...emitBlock(b, depth + 1));
  }
  return lines;
}

// ─── Action emission ──────────────────────────────────────────────────────────

function emitActionBlock(block: ActionBlock, depth: number): string[] {
  const ind = indent(depth);
  const line = emitAction(block);
  return [`${ind}${line}`];
}

function emitAction(block: ActionBlock): string {
  switch (block.kind) {
    case 'keep':    return 'keep;';
    case 'discard': return 'discard;';
    case 'stop':    return 'stop;';

    case 'redirect': {
      const copy = block.copy ? ' :copy' : '';
      return `redirect${copy} "${escapeString(block.address)}";`;
    }

    case 'fileinto': {
      const copy = block.copy ? ' :copy' : '';
      return `fileinto${copy} "${escapeString(block.mailbox)}";`;
    }

    case 'reject':
    case 'ereject':
      return `${block.kind} "${escapeString(block.message)}";`;

    case 'vacation': {
      const parts: string[] = ['vacation'];
      if (block.days !== undefined) parts.push(`:days ${block.days}`);
      if (block.from)               parts.push(`:from "${escapeString(block.from)}"`);
      if (block.handle)             parts.push(`:handle "${escapeString(block.handle)}"`);
      if (block.addresses && block.addresses.length > 0) {
        parts.push(`:addresses [${block.addresses.map(a => `"${escapeString(a)}"`).join(', ')}]`);
      }
      if (block.mime)               parts.push(':mime');
      parts.push(`:subject "${escapeString(block.subject)}"`);
      parts.push(`"${escapeString(block.body)}"`);
      return parts.join(' ') + ';';
    }

    case 'set': {
      const mods = block.modifiers && block.modifiers.length > 0
        ? block.modifiers.join(' ') + ' '
        : '';
      return `set ${mods}"${escapeString(block.name)}" "${escapeString(block.value)}";`;
    }
  }
}

// ─── Test emission ────────────────────────────────────────────────────────────

function emitTest(test: TestNode): string {
  switch (test.kind) {
    case 'true':  return 'true';
    case 'false': return 'false';

    case 'exists':
      return `exists ${emitStringList(test.headers)}`;

    case 'size':
      return `size ${test.comparison} ${test.bytes}`;

    case 'address': {
      const parts: string[] = ['address'];
      if (test.addressPart !== ':all') parts.push(test.addressPart);
      parts.push(test.matchType);
      if (test.comparator !== 'i;ascii-casemap') parts.push(`:comparator "${test.comparator}"`);
      parts.push(emitStringList(test.headers));
      parts.push(emitStringList(test.keys));
      return parts.join(' ');
    }

    case 'header': {
      const parts: string[] = ['header'];
      parts.push(test.matchType);
      if (test.comparator !== 'i;ascii-casemap') parts.push(`:comparator "${test.comparator}"`);
      parts.push(emitStringList(test.headers));
      parts.push(emitStringList(test.keys));
      return parts.join(' ');
    }

    case 'not':
      return `not ${emitTest(test.test)}`;

    case 'allof':
      if (test.tests.length === 0) return 'allof ()';
      return `allof (${test.tests.map(emitTest).join(',\n         ')})`;

    case 'anyof':
      if (test.tests.length === 0) return 'anyof ()';
      return `anyof (${test.tests.map(emitTest).join(',\n         ')})`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emitStringList(values: string[]): string {
  if (values.length === 1) return `"${escapeString(values[0]!)}"`;
  return `[${values.map(v => `"${escapeString(v)}"`).join(', ')}]`;
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
