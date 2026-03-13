import type { NodeId } from './sieve';

export interface ValidationError {
  blockId: NodeId;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ParseError {
  line: number;
  col: number;
  message: string;
  construct?: string;
}
