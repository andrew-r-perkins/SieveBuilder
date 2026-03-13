import { tokenize, type Token } from './tokenizer';
import type {
  SieveScript, TopLevelBlock, BodyBlock, IfBlock, ElsifBlock, ElseBlock,
  ActionBlock, CommentBlock, TestNode, MatchType, Comparator, AddressPart, SetModifier,
} from '../types/sieve';
import type { ParseError } from '../types/errors';
import { newId } from '../utils/idgen';

export function parseSieve(src: string): { script: SieveScript | null; errors: ParseError[] } {
  const tokens = tokenize(src);
  const errors: ParseError[] = [];
  let pos = 0;

  function peek(): Token { return tokens[pos] ?? { type: 'eof', value: '', line: 0, col: 0 }; }
  function consume(): Token { return tokens[pos++] ?? { type: 'eof', value: '', line: 0, col: 0 }; }
  function at(type: Token['type'], value?: string): boolean {
    const t = peek();
    return t.type === type && (value === undefined || t.value === value);
  }
  function expect(type: Token['type'], value?: string): Token | null {
    if (!at(type, value)) {
      const t = peek();
      errors.push({ line: t.line, col: t.col, message: `Expected ${value ?? type}, got "${t.value}"` });
      return null;
    }
    return consume();
  }

  function fail(message: string, construct?: string): null {
    const t = peek();
    errors.push({ line: t.line, col: t.col, message, construct });
    return null;
  }

  // ─── String / string list ───────────────────────────────────────────────────

  function parseString(): string | null {
    if (!at('string')) { fail('Expected string literal'); return null; }
    return consume().value;
  }

  function parseStringList(): string[] | null {
    if (at('string')) return [consume().value];
    if (!at('bracket', '[')) { fail('Expected string or string list'); return null; }
    consume(); // [
    const values: string[] = [];
    while (!at('bracket', ']') && !at('eof')) {
      const s = parseString();
      if (s === null) return null;
      values.push(s);
      if (at('bracket', ',') || at('bracket', ';')) consume(); // allow comma or skip
    }
    if (!expect('bracket', ']')) return null;
    return values;
  }

  // ─── Tests ──────────────────────────────────────────────────────────────────

  function parseTest(): TestNode | null {
    const t = peek();
    if (t.type !== 'identifier') return fail('Expected test identifier');

    const name = consume().value.toLowerCase();

    switch (name) {
      case 'true':  return { id: newId(), kind: 'true' };
      case 'false': return { id: newId(), kind: 'false' };

      case 'not': {
        const inner = parseTest();
        if (!inner) return null;
        return { id: newId(), kind: 'not', test: inner };
      }

      case 'allof':
      case 'anyof': {
        if (!expect('bracket', '(')) return null;
        const tests: TestNode[] = [];
        while (!at('bracket', ')') && !at('eof')) {
          const test = parseTest();
          if (!test) return null;
          tests.push(test);
          if (at('bracket', ',')) consume();
        }
        if (!expect('bracket', ')')) return null;
        return { id: newId(), kind: name, tests };
      }

      case 'exists': {
        const headers = parseStringList();
        if (!headers) return null;
        return { id: newId(), kind: 'exists', headers };
      }

      case 'size': {
        const cmp = peek();
        if (cmp.type !== 'tag' || (cmp.value !== ':over' && cmp.value !== ':under')) {
          return fail('Expected :over or :under for size test');
        }
        consume();
        if (!at('number')) return fail('Expected number for size test');
        const bytes = Number(consume().value);
        return { id: newId(), kind: 'size', comparison: cmp.value as ':over' | ':under', bytes };
      }

      case 'header':
      case 'address':
      case 'envelope': {
        // Parse optional tagged args
        let matchType: MatchType = ':is';
        let comparator: Comparator = 'i;ascii-casemap';
        let addressPart: AddressPart = ':all';

        while (at('tag')) {
          const tag = peek().value;
          if ([':is', ':contains', ':matches', ':regex', ':value', ':count'].includes(tag)) {
            matchType = consume().value as MatchType;
          } else if (tag === ':comparator') {
            consume();
            const c = parseString();
            if (!c) return null;
            comparator = c as Comparator;
          } else if ([':localpart', ':domain', ':all'].includes(tag)) {
            addressPart = consume().value as AddressPart;
          } else {
            // Unknown tag — skip value
            consume();
            if (at('string') || at('number')) consume();
          }
        }

        const headers = parseStringList();
        if (!headers) return null;
        const keys = parseStringList();
        if (!keys) return null;

        if (name === 'address' || name === 'envelope') {
          return { id: newId(), kind: 'address', addressPart, matchType, comparator, headers, keys };
        }
        return { id: newId(), kind: 'header', matchType, comparator, headers, keys };
      }

      default:
        return fail(`Unknown test: "${name}"`, name);
    }
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  function parseAction(name: string): ActionBlock | null {
    switch (name.toLowerCase()) {
      case 'keep':    if (!expect('semicolon')) return null; return { id: newId(), kind: 'keep' };
      case 'discard': if (!expect('semicolon')) return null; return { id: newId(), kind: 'discard' };
      case 'stop':    if (!expect('semicolon')) return null; return { id: newId(), kind: 'stop' };

      case 'redirect': {
        let copy = false;
        while (at('tag')) {
          if (peek().value === ':copy') { consume(); copy = true; }
          else { consume(); }
        }
        const address = parseString();
        if (address === null) return null;
        if (!expect('semicolon')) return null;
        return { id: newId(), kind: 'redirect', address, ...(copy ? { copy: true } : {}) };
      }

      case 'fileinto': {
        let copy = false;
        while (at('tag')) {
          if (peek().value === ':copy') { consume(); copy = true; }
          else { consume(); }
        }
        const mailbox = parseString();
        if (mailbox === null) return null;
        if (!expect('semicolon')) return null;
        return { id: newId(), kind: 'fileinto', mailbox, ...(copy ? { copy: true } : {}) };
      }

      case 'reject':
      case 'ereject': {
        const message = parseString();
        if (message === null) return null;
        if (!expect('semicolon')) return null;
        return { id: newId(), kind: name as 'reject' | 'ereject', message };
      }

      case 'vacation': {
        let days: number | undefined;
        let from: string | undefined;
        let handle: string | undefined;
        let mime = false;
        let addresses: string[] | undefined;

        while (at('tag')) {
          const tag = peek().value;
          consume();
          if (tag === ':days') { if (!at('number')) return null; days = Number(consume().value); }
          else if (tag === ':from') { from = parseString() ?? undefined; }
          else if (tag === ':handle') { handle = parseString() ?? undefined; }
          else if (tag === ':mime') { mime = true; }
          else if (tag === ':addresses') { addresses = parseStringList() ?? undefined; }
          else if (tag === ':subject') { /* consumed below */ }
          else { if (at('string') || at('number')) consume(); }
        }

        const subject = parseString() ?? '';
        const body = parseString() ?? '';
        if (!expect('semicolon')) return null;
        return { id: newId(), kind: 'vacation', subject, body, days, from, handle, mime: mime || undefined, addresses };
      }

      case 'set': {
        const modifiers: string[] = [];
        while (at('tag')) { modifiers.push(consume().value); }
        const name_ = parseString();
        if (name_ === null) return null;
        const value = parseString();
        if (value === null) return null;
        if (!expect('semicolon')) return null;
        return { id: newId(), kind: 'set', name: name_, value, modifiers: modifiers.length ? modifiers as SetModifier[] : undefined };
      }

      default:
        return fail(`Unknown action: "${name}"`, name);
    }
  }

  // ─── Body (list of commands) ────────────────────────────────────────────────

  function parseBody(): BodyBlock[] | null {
    const blocks: BodyBlock[] = [];
    while (!at('bracket', '}') && !at('eof')) {
      const block = parseCommand();
      if (block === null) return null;
      if (block !== 'require') blocks.push(block as BodyBlock);
    }
    return blocks;
  }

  // ─── Commands ───────────────────────────────────────────────────────────────

  function parseCommand(): TopLevelBlock | 'require' | null {
    // Comment tokens become CommentBlock nodes
    if (at('comment')) {
      const t = consume();
      const comment: CommentBlock = {
        id: newId(),
        kind: 'comment',
        style: t.commentStyle ?? 'hash',
        text: t.value,
      };
      return comment;
    }

    const t = peek();
    if (t.type !== 'identifier') return fail(`Expected command, got "${t.value}"`);
    const name = consume().value.toLowerCase();

    if (name === 'require') {
      // Silently consume require
      parseStringList();
      expect('semicolon');
      return 'require';
    }

    if (name === 'if') {
      return parseIfControl();
    }

    return parseAction(name);
  }

  function parseIfControl(): IfBlock | null {
    const test = parseTest();
    if (!test) return null;
    if (!expect('bracket', '{')) return null;
    const body = parseBody();
    if (body === null) return null;
    if (!expect('bracket', '}')) return null;

    const branches: (ElsifBlock | ElseBlock)[] = [];

    while (at('identifier', 'elsif') || at('identifier', 'else')) {
      const keyword = consume().value.toLowerCase();
      if (keyword === 'elsif') {
        const bTest = parseTest();
        if (!bTest) return null;
        if (!expect('bracket', '{')) return null;
        const bBody = parseBody();
        if (bBody === null) return null;
        if (!expect('bracket', '}')) return null;
        branches.push({ id: newId(), kind: 'elsif', test: bTest, body: bBody });
      } else {
        if (!expect('bracket', '{')) return null;
        const bBody = parseBody();
        if (bBody === null) return null;
        if (!expect('bracket', '}')) return null;
        branches.push({ id: newId(), kind: 'else', body: bBody });
        break; // else is always last
      }
    }

    return { id: newId(), kind: 'if', test, body, branches, collapsed: false };
  }

  // ─── Script root ────────────────────────────────────────────────────────────

  const blocks: TopLevelBlock[] = [];
  while (!at('eof')) {
    const result = parseCommand();
    if (result === null) {
      return { script: null, errors };
    }
    if (result !== 'require') {
      blocks.push(result as TopLevelBlock);
    }
  }

  if (errors.length > 0) return { script: null, errors };

  return {
    script: { id: newId(), blocks },
    errors: [],
  };
}
