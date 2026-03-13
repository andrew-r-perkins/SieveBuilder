import { useScriptStore, selectCanUndo, selectCanRedo } from '../store/useScriptStore';

export function useUndo() {
  const undo = useScriptStore((s) => s.undo);
  const redo = useScriptStore((s) => s.redo);
  const canUndo = useScriptStore(selectCanUndo);
  const canRedo = useScriptStore(selectCanRedo);
  return { undo, redo, canUndo, canRedo };
}
