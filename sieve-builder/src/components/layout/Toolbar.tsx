import { useRef } from 'react';
import { useScriptStore } from '@/store/useScriptStore';
import { useUndo } from '@/hooks/useUndo';
import { generateSieve } from '@/generator/generator';
import { newId } from '@/utils/idgen';
import type { IfBlock, ActionBlock } from '@/types/sieve';

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { undo, redo, canUndo, canRedo } = useUndo();
  const { script, doAddBlock, doNewScript, setScript, setImportErrors } = useScriptStore();

  function handleAddAction() {
    const block: ActionBlock = { id: newId(), kind: 'keep' };
    doAddBlock(script.id, script.blocks.length, block);
  }

  function handleAddIf() {
    const block: IfBlock = {
      id: newId(),
      kind: 'if',
      test: { id: newId(), kind: 'true' },
      body: [],
      branches: [],
      collapsed: false,
    };
    doAddBlock(script.id, script.blocks.length, block);
  }

  function handleExport() {
    const text = generateSieve(script);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filter.sieve';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    const { parseSieve } = await import('@/parser/parser');
    const { script: parsed, errors } = parseSieve(text);
    if (errors.length > 0) {
      setImportErrors(errors);
    } else if (parsed) {
      setImportErrors([]);
      setScript(parsed);
    }
  }

  return (
    <div style={styles.toolbar}>
      <div style={styles.left}>
        <span style={styles.brand}>SieveBuilder</span>
      </div>
      <div style={styles.center}>
        <Btn onClick={handleAddAction}>+ Action</Btn>
        <Btn onClick={handleAddIf}>+ If block</Btn>
      </div>
      <div style={styles.right}>
        <Btn onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">↩ Undo</Btn>
        <Btn onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">↪ Redo</Btn>
        <Btn onClick={handleImportClick}>Import</Btn>
        <Btn onClick={handleExport} accent>Export .sieve</Btn>
        <Btn onClick={doNewScript} danger>New</Btn>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".sieve"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}

function Btn({ children, onClick, disabled, title, accent, danger }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...styles.btn,
        ...(accent ? styles.btnAccent : {}),
        ...(danger ? styles.btnDanger : {}),
        ...(disabled ? styles.btnDisabled : {}),
      }}
    >
      {children}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    height: 44,
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
    gap: 8,
    flexShrink: 0,
  },
  left: { display: 'flex', alignItems: 'center', marginRight: 'auto' },
  center: { display: 'flex', gap: 6 },
  right: { display: 'flex', gap: 6, marginLeft: 'auto' },
  brand: { fontWeight: 600, color: 'var(--accent)', letterSpacing: 0.5 },
  btn: {
    padding: '4px 10px',
    borderRadius: 5,
    border: '1px solid var(--border)',
    background: 'var(--bg-raised)',
    color: 'var(--text)',
    fontSize: 13,
    transition: 'background 0.1s',
  },
  btnAccent: {
    background: 'var(--accent)',
    color: '#1e1e2e',
    border: '1px solid transparent',
    fontWeight: 600,
  },
  btnDanger: {
    background: 'transparent',
    color: 'var(--red)',
    border: '1px solid var(--red)',
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
};
