import { useMemo } from 'react';
import { useScriptStore } from '../store/useScriptStore';
import { validate } from '../validator/validator';
import type { ValidationError } from '../types/errors';
import type { NodeId } from '../types/sieve';

export function useValidation(): { errors: ValidationError[]; errorsForBlock: (id: NodeId) => ValidationError[] } {
  const script = useScriptStore((s) => s.script);
  const errors = useMemo(() => validate(script), [script]);
  const errorsForBlock = useMemo(() => {
    const map = new Map<NodeId, ValidationError[]>();
    for (const err of errors) {
      const list = map.get(err.blockId) ?? [];
      list.push(err);
      map.set(err.blockId, list);
    }
    return (id: NodeId) => map.get(id) ?? [];
  }, [errors]);
  return { errors, errorsForBlock };
}
