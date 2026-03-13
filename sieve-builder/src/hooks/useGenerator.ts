import { useMemo } from 'react';
import { useScriptStore } from '../store/useScriptStore';
import { generateSieve } from '../generator/generator';

export function useGenerator(): string {
  const script = useScriptStore((s) => s.script);
  return useMemo(() => generateSieve(script), [script]);
}
