export type TokenType =
  | 'identifier' | 'tag' | 'string' | 'number' | 'bracket' | 'semicolon' | 'comment' | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
  commentStyle?: 'hash' | 'bracket';
}

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  function current() { return src[pos] ?? ''; }
  function peek(offset = 1) { return src[pos + offset] ?? ''; }
  function advance() {
    const ch = src[pos++]!;
    if (ch === '\n') { line++; col = 1; } else { col++; }
    return ch;
  }

  while (pos < src.length) {
    const ch = current();

    // Whitespace
    if (/\s/.test(ch)) { advance(); continue; }

    // Line comment
    if (ch === '#') {
      const startLine = line;
      const startCol = col;
      advance(); // skip #
      let text = '';
      while (pos < src.length && current() !== '\n') text += advance();
      tokens.push({ type: 'comment', value: text.replace(/^\s/, ''), commentStyle: 'hash', line: startLine, col: startCol });
      continue;
    }

    // Block comment
    if (ch === '/' && peek() === '*') {
      const startLine = line;
      const startCol = col;
      advance(); advance(); // skip /*
      let text = '';
      while (pos < src.length) {
        if (current() === '*' && peek() === '/') { advance(); advance(); break; }
        text += advance();
      }
      tokens.push({ type: 'comment', value: text.replace(/^\s+|\s+$/g, ''), commentStyle: 'bracket', line: startLine, col: startCol });
      continue;
    }

    const startLine = line;
    const startCol = col;

    // Multi-line string: text: ... .:
    if (ch === 't' && src.slice(pos, pos + 5) === 'text:') {
      // Skip "text:" and optional whitespace to end of line
      for (let i = 0; i < 5; i++) advance();
      while (pos < src.length && current() !== '\n') advance();
      if (pos < src.length) advance(); // consume newline
      // Read until line containing only "."
      let content = '';
      while (pos < src.length) {
        let lineContent = '';
        while (pos < src.length && current() !== '\n') {
          lineContent += advance();
        }
        if (pos < src.length) advance(); // newline
        if (lineContent === '.') break;
        content += (content ? '\n' : '') + lineContent;
      }
      tokens.push({ type: 'string', value: content, line: startLine, col: startCol });
      continue;
    }

    // Quoted string
    if (ch === '"') {
      advance();
      let value = '';
      while (pos < src.length && current() !== '"') {
        if (current() === '\\') { advance(); value += advance(); }
        else { value += advance(); }
      }
      advance(); // closing "
      tokens.push({ type: 'string', value, line: startLine, col: startCol });
      continue;
    }

    // Tag (:word)
    if (ch === ':') {
      advance();
      let value = ':';
      while (pos < src.length && /\w/.test(current())) value += advance();
      tokens.push({ type: 'tag', value, line: startLine, col: startCol });
      continue;
    }

    // Number (with optional K/M/G quantifier)
    if (/\d/.test(ch)) {
      let value = '';
      while (pos < src.length && /\d/.test(current())) value += advance();
      let multiplier = 1;
      if (/[KkMmGg]/.test(current())) {
        const q = advance().toUpperCase();
        if (q === 'K') multiplier = 1024;
        else if (q === 'M') multiplier = 1024 * 1024;
        else if (q === 'G') multiplier = 1024 * 1024 * 1024;
      }
      tokens.push({ type: 'number', value: String(Number(value) * multiplier), line: startLine, col: startCol });
      continue;
    }

    // Identifier
    if (/[a-zA-Z_]/.test(ch)) {
      let value = '';
      while (pos < src.length && /[\w]/.test(current())) value += advance();
      tokens.push({ type: 'identifier', value, line: startLine, col: startCol });
      continue;
    }

    // Brackets and semicolons
    if ('{}[]();,'.includes(ch)) {
      const type: TokenType = ch === ';' ? 'semicolon' : 'bracket';
      tokens.push({ type, value: advance(), line: startLine, col: startCol });
      continue;
    }

    // Unknown — skip
    advance();
  }

  tokens.push({ type: 'eof', value: '', line, col });
  return tokens;
}
