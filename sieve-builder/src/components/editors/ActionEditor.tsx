import { useState, useEffect } from 'react';
import { useScriptStore } from '@/store/useScriptStore';
import type { ActionBlock } from '@/types/sieve';
import { newId } from '@/utils/idgen';

interface Props {
  block: ActionBlock;
  onClose: () => void;
}

export function ActionEditor({ block, onClose }: Props) {
  const doUpdateBlock = useScriptStore(s => s.doUpdateBlock);

  function changeKind(kind: ActionBlock['kind']) {
    const base: Record<string, ActionBlock> = {
      keep:    { id: block.id, kind: 'keep' },
      discard: { id: block.id, kind: 'discard' },
      stop:    { id: block.id, kind: 'stop' },
      redirect:{ id: block.id, kind: 'redirect', address: '' },
      fileinto:{ id: block.id, kind: 'fileinto', mailbox: '' },
      reject:  { id: block.id, kind: 'reject', message: '' },
      ereject: { id: block.id, kind: 'ereject', message: '' },
      vacation:{ id: block.id, kind: 'vacation', subject: '', body: '' },
      set:     { id: block.id, kind: 'set', name: '', value: '' },
    };
    doUpdateBlock(block.id, base[kind]!);
  }

  function upd(patch: Partial<ActionBlock>) {
    doUpdateBlock(block.id, { ...block, ...patch } as ActionBlock);
  }

  return (
    <div style={styles.editor}>
      <div style={styles.row}>
        <label style={styles.label}>Action type</label>
        <select
          value={block.kind}
          onChange={e => changeKind(e.target.value as ActionBlock['kind'])}
          style={styles.select}
        >
          <optgroup label="Delivery">
            <option value="keep">keep</option>
            <option value="discard">discard</option>
            <option value="fileinto">fileinto</option>
            <option value="redirect">redirect</option>
          </optgroup>
          <optgroup label="Control">
            <option value="stop">stop</option>
          </optgroup>
          <optgroup label="Response">
            <option value="reject">reject</option>
            <option value="ereject">ereject</option>
            <option value="vacation">vacation</option>
          </optgroup>
          <optgroup label="Variables">
            <option value="set">set variable</option>
          </optgroup>
        </select>
      </div>

      {block.kind === 'redirect' && (
        <>
          <Field label="Email address" value={block.address}
            onChange={v => upd({ ...block, address: v })} />
          <CheckField label="Copy mode (:copy)" checked={!!block.copy}
            onChange={v => upd({ ...block, copy: v })} />
        </>
      )}

      {block.kind === 'fileinto' && (
        <>
          <Field label="Mailbox" value={block.mailbox}
            onChange={v => upd({ ...block, mailbox: v })} />
          <CheckField label="Copy mode (:copy)" checked={!!block.copy}
            onChange={v => upd({ ...block, copy: v })} />
        </>
      )}

      {(block.kind === 'reject' || block.kind === 'ereject') && (
        <Field label="Rejection message" value={block.message}
          onChange={v => upd({ ...block, message: v })} />
      )}

      {block.kind === 'vacation' && <VacationFields block={block} upd={upd} />}

      {block.kind === 'set' && (
        <>
          <Field label="Variable name" value={block.name}
            onChange={v => upd({ ...block, name: v })} placeholder="e.g. myvar" />
          <Field label="Value" value={block.value}
            onChange={v => upd({ ...block, value: v })} />
        </>
      )}

      <button onClick={onClose} style={styles.closeBtn}>Done</button>
    </div>
  );
}

function VacationFields({ block, upd }: { block: Extract<ActionBlock, { kind: 'vacation' }>; upd: (p: Partial<ActionBlock>) => void }) {
  const addAddress = () => {
    upd({ ...block, addresses: [...(block.addresses ?? []), ''] });
  };
  const updateAddress = (i: number, v: string) => {
    const addresses = [...(block.addresses ?? [])];
    addresses[i] = v;
    upd({ ...block, addresses });
  };
  const removeAddress = (i: number) => {
    const addresses = (block.addresses ?? []).filter((_, j) => j !== i);
    upd({ ...block, addresses });
  };
  return (
    <>
      <Field label="Subject" value={block.subject} onChange={v => upd({ ...block, subject: v })} />
      <Field label="Body" value={block.body} onChange={v => upd({ ...block, body: v })} multiline />
      <Field label="Days between replies" value={block.days?.toString() ?? ''}
        onChange={v => upd({ ...block, days: v ? Number(v) : undefined })} placeholder="optional" type="number" />
      <Field label="From address" value={block.from ?? ''}
        onChange={v => upd({ ...block, from: v || undefined })} placeholder="optional" />
      <Field label="Handle (unique id)" value={block.handle ?? ''}
        onChange={v => upd({ ...block, handle: v || undefined })} placeholder="optional" />
      <CheckField label="MIME body (:mime)" checked={!!block.mime} onChange={v => upd({ ...block, mime: v })} />
      <div style={styles.row}>
        <label style={styles.label}>My addresses</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(block.addresses ?? []).map((addr, i) => (
            <div key={i} style={{ display: 'flex', gap: 4 }}>
              <LocalInput value={addr} onCommit={v => updateAddress(i, v)} style={{ flex: 1 }} />
              <button onClick={() => removeAddress(i)} style={styles.removeBtn}>×</button>
            </div>
          ))}
          <button onClick={addAddress} style={styles.addBtn}>+ add address</button>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, onChange, placeholder, multiline, type }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; type?: string;
}) {
  const [local, setLocal] = useState(value);
  // Sync when the store value changes (e.g. undo/redo restores it)
  useEffect(() => setLocal(value), [value]);

  function commit(v: string) { if (v !== value) onChange(v); }

  return (
    <div style={styles.row}>
      <label style={styles.label}>{label}</label>
      {multiline
        ? <textarea value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={e => commit(e.target.value)}
            placeholder={placeholder}
            rows={3} style={{ ...styles.input, resize: 'vertical' }} />
        : <input type={type ?? 'text'} value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={e => commit(e.target.value)}
            placeholder={placeholder} style={styles.input} />
      }
    </div>
  );
}

/** Text input with local buffering — commits to store only on blur */
function LocalInput({ value, onCommit, style, type }: {
  value: string; onCommit: (v: string) => void; style?: React.CSSProperties; type?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  function commit(v: string) { if (v !== value) onCommit(v); }
  return (
    <input type={type ?? 'text'} value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => commit(e.target.value)}
      style={style} />
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = newId();
  return (
    <div style={{ ...styles.row, alignItems: 'center' }}>
      <label style={styles.label} htmlFor={id}>{label}</label>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  editor: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    background: 'var(--bg-raised)',
    borderTop: '1px solid var(--border)',
  },
  row: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  label: { width: 160, flexShrink: 0, color: 'var(--text-muted)', paddingTop: 4, fontSize: 12 },
  select: { flex: 1 },
  input: { flex: 1 },
  closeBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    padding: '4px 12px',
    background: 'var(--accent)',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 4,
    fontWeight: 600,
  },
  addBtn: {
    alignSelf: 'flex-start',
    padding: '2px 8px',
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 4,
    fontSize: 12,
  },
  removeBtn: {
    padding: '2px 6px',
    background: 'transparent',
    color: 'var(--red)',
    border: '1px solid var(--red)',
    borderRadius: 4,
  },
};
