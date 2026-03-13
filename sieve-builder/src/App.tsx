import { useEffect } from 'react';
import { Toolbar } from '@/components/layout/Toolbar';
import { SplitLayout } from '@/components/layout/SplitLayout';
import { useUndo } from '@/hooks/useUndo';

function App() {
  const { undo, redo } = useUndo();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) { e.preventDefault(); redo(); }
        else { e.preventDefault(); undo(); }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  return (
    <div style={styles.app}>
      <Toolbar />
      <SplitLayout />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
};

export default App;
