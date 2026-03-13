import type {
  SieveScript, TopLevelBlock, BodyBlock, IfBlock, TestNode,
} from '../types/sieve';

export function collectRequires(script: SieveScript): string[] {
  const caps = new Set<string>();
  for (const block of script.blocks) {
    visitBlock(block, caps);
  }
  return Array.from(caps).sort();
}

function visitBlock(block: TopLevelBlock | BodyBlock, caps: Set<string>): void {
  if (block.kind === 'if') {
    visitIfBlock(block, caps);
    return;
  }
  switch (block.kind) {
    case 'fileinto':
      caps.add('fileinto');
      break;
    case 'reject':
    case 'ereject':
      caps.add('reject');
      break;
    case 'vacation':
      caps.add('vacation');
      break;
    case 'set':
      caps.add('variables');
      break;
  }
}

function visitIfBlock(block: IfBlock, caps: Set<string>): void {
  visitTest(block.test, caps);
  for (const b of block.body) visitBlock(b, caps);
  for (const branch of block.branches) {
    if (branch.kind === 'elsif') visitTest(branch.test, caps);
    for (const b of branch.body) visitBlock(b, caps);
  }
}

function visitTest(test: TestNode, caps: Set<string>): void {
  switch (test.kind) {
    case 'address':
    case 'header':
      if (test.matchType === ':regex') caps.add('regex');
      if (test.matchType === ':value' || test.matchType === ':count') caps.add('relational');
      break;
    case 'allof':
    case 'anyof':
      for (const t of test.tests) visitTest(t, caps);
      break;
    case 'not':
      visitTest(test.test, caps);
      break;
  }
}
