import type { SieveScript, TopLevelBlock, BodyBlock, IfBlock, TestNode, NodeId } from '../types/sieve';
import type { ValidationError } from '../types/errors';
import { isIfBlock } from '../types/sieve';

export function validate(script: SieveScript): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const block of script.blocks) {
    validateBlock(block, errors);
  }
  return errors;
}

function validateBlock(block: TopLevelBlock | BodyBlock, errors: ValidationError[]): void {
  if (isIfBlock(block)) {
    validateIfBlock(block, errors);
    return;
  }
  validateAction(block, errors);
}

function validateIfBlock(block: IfBlock, errors: ValidationError[]): void {
  validateTest(block.test, block.id, errors);
  validateBranchBody(block.body, block.id, errors);
  for (const branch of block.branches) {
    if (branch.kind === 'elsif') validateTest(branch.test, branch.id, errors);
    validateBranchBody(branch.body, branch.id, errors);
  }
}

function validateBranchBody(body: BodyBlock[], parentId: NodeId, errors: ValidationError[]): void {
  // Check for conflicting terminal actions
  const terminals = body.filter(b =>
    b.kind === 'keep' || b.kind === 'discard' || b.kind === 'stop' ||
    (b.kind === 'redirect' && !('copy' in b && b.copy)) ||
    (b.kind === 'fileinto' && !('copy' in b && b.copy))
  );
  if (terminals.length > 1) {
    errors.push({
      blockId: parentId,
      code: 'CONFLICTING_TERMINAL_ACTIONS',
      message: 'Multiple terminal actions in the same branch may produce unexpected results.',
      severity: 'warning',
    });
  }
  for (const block of body) validateBlock(block, errors);
}

function validateAction(block: TopLevelBlock | BodyBlock, errors: ValidationError[]): void {
  if (isIfBlock(block)) return;
  switch (block.kind) {
    case 'redirect':
      if (!block.address || block.address.trim() === '') {
        errors.push({ blockId: block.id, code: 'MISSING_REDIRECT_ADDRESS', message: 'Redirect requires an email address.', severity: 'error' });
      }
      break;
    case 'fileinto':
      if (!block.mailbox || block.mailbox.trim() === '') {
        errors.push({ blockId: block.id, code: 'MISSING_FILEINTO_MAILBOX', message: 'File-into requires a mailbox name.', severity: 'error' });
      }
      break;
    case 'reject':
    case 'ereject':
      if (!block.message || block.message.trim() === '') {
        errors.push({ blockId: block.id, code: 'MISSING_REJECT_MESSAGE', message: 'Reject requires a message.', severity: 'error' });
      }
      break;
    case 'vacation':
      if ((!block.subject || block.subject.trim() === '') && (!block.body || block.body.trim() === '')) {
        errors.push({ blockId: block.id, code: 'VACATION_MISSING_CONTENT', message: 'Vacation requires at least a subject or body.', severity: 'error' });
      }
      if (block.days !== undefined && (block.days < 1 || block.days > 9999)) {
        errors.push({ blockId: block.id, code: 'VACATION_DAYS_RANGE', message: 'Vacation days must be between 1 and 9999.', severity: 'error' });
      }
      break;
    case 'set':
      if (!block.name || block.name.trim() === '') {
        errors.push({ blockId: block.id, code: 'SET_MISSING_NAME', message: 'Set requires a variable name.', severity: 'error' });
      }
      break;
  }
}

function validateTest(test: TestNode, blockId: NodeId, errors: ValidationError[]): void {
  switch (test.kind) {
    case 'address':
    case 'header':
      if (test.headers.length === 0) {
        errors.push({ blockId, code: 'TEST_MISSING_HEADERS', message: `${test.kind} test requires at least one header.`, severity: 'error' });
      }
      if (test.keys.length === 0) {
        errors.push({ blockId, code: 'TEST_MISSING_KEYS', message: `${test.kind} test requires at least one match value.`, severity: 'error' });
      }
      if (test.matchType === ':regex') {
        for (const key of test.keys) {
          try { new RegExp(key); }
          catch {
            errors.push({ blockId, code: 'INVALID_REGEX', message: `Invalid regex pattern: "${key}"`, severity: 'error' });
          }
        }
      }
      break;
    case 'exists':
      if (test.headers.length === 0) {
        errors.push({ blockId, code: 'EXISTS_MISSING_HEADERS', message: 'Exists test requires at least one header name.', severity: 'error' });
      }
      break;
    case 'allof':
    case 'anyof':
      for (const t of test.tests) validateTest(t, blockId, errors);
      break;
    case 'not':
      validateTest(test.test, blockId, errors);
      break;
  }
}
