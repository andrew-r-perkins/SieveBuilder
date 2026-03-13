// ─── Shared ───────────────────────────────────────────────────────────────────

export type NodeId = string;

// ─── Match types / comparators / address parts ───────────────────────────────

export type MatchType = ':is' | ':contains' | ':matches' | ':regex' | ':value' | ':count';
export type Comparator = 'i;octet' | 'i;ascii-casemap' | 'i;ascii-numeric';
export type AddressPart = ':localpart' | ':domain' | ':all';

// ─── Test nodes ──────────────────────────────────────────────────────────────

export type TestNode =
  | { id: NodeId; kind: 'address'; addressPart: AddressPart; matchType: MatchType; comparator: Comparator; headers: string[]; keys: string[] }
  | { id: NodeId; kind: 'header'; matchType: MatchType; comparator: Comparator; headers: string[]; keys: string[] }
  | { id: NodeId; kind: 'size'; comparison: ':over' | ':under'; bytes: number }
  | { id: NodeId; kind: 'exists'; headers: string[] }
  | { id: NodeId; kind: 'true' }
  | { id: NodeId; kind: 'false' }
  | { id: NodeId; kind: 'allof'; tests: TestNode[] }
  | { id: NodeId; kind: 'anyof'; tests: TestNode[] }
  | { id: NodeId; kind: 'not'; test: TestNode };

// ─── Comment blocks ───────────────────────────────────────────────────────────

export interface CommentBlock {
  id: NodeId;
  kind: 'comment';
  /** hash = # …  /  bracket = /* … *\/ */
  style: 'hash' | 'bracket';
  text: string;
}

// ─── Action blocks (leaf blocks) ─────────────────────────────────────────────

export type ActionBlock =
  | { id: NodeId; kind: 'keep' }
  | { id: NodeId; kind: 'discard' }
  | { id: NodeId; kind: 'stop' }
  | { id: NodeId; kind: 'redirect'; address: string; copy?: boolean }
  | { id: NodeId; kind: 'fileinto'; mailbox: string; copy?: boolean }
  | { id: NodeId; kind: 'reject' | 'ereject'; message: string }
  | { id: NodeId; kind: 'vacation'; subject: string; body: string; days?: number; from?: string; addresses?: string[]; handle?: string; mime?: boolean }
  | { id: NodeId; kind: 'set'; name: string; value: string; modifiers?: SetModifier[] };

export type SetModifier = ':lower' | ':upper' | ':lowerfirst' | ':upperfirst' | ':quotewildcard' | ':length';

// ─── Container blocks ────────────────────────────────────────────────────────

/** Contents of any if/elsif/else branch body */
export type BodyBlock = ActionBlock | IfBlock | CommentBlock;

export interface ElseBlock {
  id: NodeId;
  kind: 'else';
  body: BodyBlock[];
}

export interface ElsifBlock {
  id: NodeId;
  kind: 'elsif';
  test: TestNode;
  body: BodyBlock[];
}

export interface IfBlock {
  id: NodeId;
  kind: 'if';
  test: TestNode;
  body: BodyBlock[];
  /** Ordered chain of elsif/else attached to this if */
  branches: (ElsifBlock | ElseBlock)[];
  /** UI-only: collapsed state, not part of code generation */
  collapsed: boolean;
}

// ─── Script root ─────────────────────────────────────────────────────────────

export type TopLevelBlock = ActionBlock | IfBlock | CommentBlock;

export interface SieveScript {
  id: NodeId;
  blocks: TopLevelBlock[];
}

// ─── Type guards ─────────────────────────────────────────────────────────────

export function isIfBlock(block: BodyBlock | TopLevelBlock): block is IfBlock {
  return block.kind === 'if';
}

export function isCommentBlock(block: BodyBlock | TopLevelBlock): block is CommentBlock {
  return block.kind === 'comment';
}

export function isActionBlock(block: BodyBlock | TopLevelBlock): block is ActionBlock {
  return block.kind !== 'if' && block.kind !== 'comment';
}
