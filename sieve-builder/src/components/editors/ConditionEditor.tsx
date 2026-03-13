import { useState, useEffect } from 'react';
import type { TestNode, NodeId, MatchType, Comparator, AddressPart } from '@/types/sieve';
import { newId } from '@/utils/idgen';

interface Props {
  test: TestNode;
  blockId: NodeId;
  /** Called with a new test to replace current one */
  onUpdate: (test: TestNode) => void;
  depth?: number;
}

export function ConditionEditor({ test, blockId, onUpdate, depth = 0 }: Props) {
  void blockId; // available for future per-block error highlighting

  function changeKind(kind: TestNode['kind']) {
    const defaults: Record<string, TestNode> = {
      true:    { id: newId(), kind: 'true' },
      false:   { id: newId(), kind: 'false' },
      exists:  { id: newId(), kind: 'exists', headers: [''] },
      size:    { id: newId(), kind: 'size', comparison: ':over', bytes: 100000 },
      address: { id: newId(), kind: 'address', addressPart: ':all', matchType: ':is', comparator: 'i;ascii-casemap', headers: ['From'], keys: [''] },
      header:  { id: newId(), kind: 'header', matchType: ':contains', comparator: 'i;ascii-casemap', headers: ['Subject'], keys: [''] },
      not:     { id: newId(), kind: 'not', test: { id: newId(), kind: 'true' } },
      allof:   { id: newId(), kind: 'allof', tests: [{ id: newId(), kind: 'header', matchType: ':contains', comparator: 'i;ascii-casemap', headers: ['Subject'], keys: [''] }] },
      anyof:   { id: newId(), kind: 'anyof', tests: [{ id: newId(), kind: 'header', matchType: ':contains', comparator: 'i;ascii-casemap', headers: ['Subject'], keys: [''] }] },
    };
    onUpdate(defaults[kind]!);
  }

  const ind = depth * 16;

  return (
    <div style={{ marginLeft: ind }}>
      <div style={styles.row}>
        <label style={styles.label}>Test type</label>
        <select value={test.kind} onChange={e => changeKind(e.target.value as TestNode['kind'])} style={styles.input}>
          <option value="header">header</option>
          <option value="address">address</option>
          <option value="exists">exists</option>
          <option value="size">size</option>
          <option value="allof">allof (all of)</option>
          <option value="anyof">anyof (any of)</option>
          <option value="not">not</option>
          <option value="true">true (always)</option>
          <option value="false">false (never)</option>
        </select>
      </div>

      {(test.kind === 'header' || test.kind === 'address') && (
        <HeaderAddressFields test={test} onUpdate={onUpdate} />
      )}

      {test.kind === 'exists' && (
        <StringListField label="Headers" values={test.headers}
          onChange={headers => onUpdate({ ...test, headers })} />
      )}

      {test.kind === 'size' && (
        <div style={styles.row}>
          <label style={styles.label}>Comparison</label>
          <select value={test.comparison} onChange={e => onUpdate({ ...test, comparison: e.target.value as ':over' | ':under' })} style={styles.input}>
            <option value=":over">:over (larger than)</option>
            <option value=":under">:under (smaller than)</option>
          </select>
          <NumberInput value={test.bytes} min={0}
            onChange={bytes => onUpdate({ ...test, bytes })}
            style={{ ...styles.input, width: 100 }} />
          <span style={{ color: 'var(--text-muted)', paddingTop: 4 }}>bytes</span>
        </div>
      )}

      {test.kind === 'not' && (
        <div style={{ marginTop: 8 }}>
          <ConditionEditor test={test.test} blockId={blockId}
            onUpdate={inner => onUpdate({ ...test, test: inner })} depth={depth + 1} />
        </div>
      )}

      {(test.kind === 'allof' || test.kind === 'anyof') && (
        <CompositeTests test={test} blockId={blockId} onUpdate={onUpdate} depth={depth} />
      )}
    </div>
  );
}

function HeaderAddressFields({ test, onUpdate }: {
  test: Extract<TestNode, { kind: 'header' | 'address' }>;
  onUpdate: (t: TestNode) => void;
}) {
  return (
    <>
      {test.kind === 'address' && (
        <div style={styles.row}>
          <label style={styles.label}>Address part</label>
          <select value={test.addressPart}
            onChange={e => onUpdate({ ...test, addressPart: e.target.value as AddressPart })}
            style={styles.input}>
            <option value=":all">:all</option>
            <option value=":localpart">:localpart</option>
            <option value=":domain">:domain</option>
          </select>
        </div>
      )}
      <div style={styles.row}>
        <label style={styles.label}>Match type</label>
        <select value={test.matchType}
          onChange={e => onUpdate({ ...test, matchType: e.target.value as MatchType })}
          style={styles.input}>
          <option value=":is">:is (exact)</option>
          <option value=":contains">:contains (substring)</option>
          <option value=":matches">:matches (wildcard)</option>
          <option value=":regex">:regex</option>
          <option value=":value">:value (relational)</option>
          <option value=":count">:count (relational)</option>
        </select>
      </div>
      <div style={styles.row}>
        <label style={styles.label}>Comparator</label>
        <select value={test.comparator}
          onChange={e => onUpdate({ ...test, comparator: e.target.value as Comparator })}
          style={styles.input}>
          <option value="i;ascii-casemap">i;ascii-casemap (default)</option>
          <option value="i;octet">i;octet</option>
          <option value="i;ascii-numeric">i;ascii-numeric</option>
        </select>
      </div>
      <StringListField label="Headers" values={test.headers}
        onChange={headers => onUpdate({ ...test, headers })} />
      <StringListField label="Match values" values={test.keys}
        onChange={keys => onUpdate({ ...test, keys })} />
    </>
  );
}

function CompositeTests({ test, blockId, onUpdate, depth }: {
  test: Extract<TestNode, { kind: 'allof' | 'anyof' }>;
  blockId: NodeId;
  onUpdate: (t: TestNode) => void;
  depth: number;
}) {
  function addTest() {
    const newTest: TestNode = { id: newId(), kind: 'header', matchType: ':contains', comparator: 'i;ascii-casemap', headers: ['Subject'], keys: [''] };
    onUpdate({ ...test, tests: [...test.tests, newTest] });
  }
  function updateAt(i: number, updated: TestNode) {
    const tests = [...test.tests];
    tests[i] = updated;
    onUpdate({ ...test, tests });
  }
  function removeAt(i: number) {
    onUpdate({ ...test, tests: test.tests.filter((_, j) => j !== i) });
  }
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {test.tests.map((t, i) => (
        <div key={t.id} style={styles.compositeItem}>
          <ConditionEditor test={t} blockId={blockId}
            onUpdate={updated => updateAt(i, updated)} depth={depth + 1} />
          <button onClick={() => removeAt(i)} style={styles.removeBtn} title="Remove condition">×</button>
        </div>
      ))}
      <button onClick={addTest} style={styles.addBtn}>+ add condition</button>
    </div>
  );
}

/** Text input buffered locally — commits to parent only on blur */
function LocalStringInput({ value, onCommit, style }: {
  value: string; onCommit: (v: string) => void; style?: React.CSSProperties;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  function commit(v: string) { if (v !== value) onCommit(v); }
  return (
    <input value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => commit(e.target.value)}
      style={style} />
  );
}

/** Number input buffered locally — commits to parent only on blur */
function NumberInput({ value, onChange, min, style }: {
  value: number; onChange: (v: number) => void; min?: number; style?: React.CSSProperties;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => setLocal(String(value)), [value]);
  function commit(v: string) {
    const n = Number(v);
    if (!isNaN(n) && n !== value) onChange(n);
  }
  return (
    <input type="number" value={local} min={min}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => commit(e.target.value)}
      style={style} />
  );
}

function StringListField({ label, values, onChange }: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  function update(i: number, v: string) {
    const next = [...values];
    next[i] = v;
    onChange(next);
  }
  function add() { onChange([...values, '']); }
  function remove(i: number) { onChange(values.filter((_, j) => j !== i)); }

  return (
    <div style={styles.row}>
      <label style={styles.label}>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {values.map((v, i) => (
          <div key={i} style={{ display: 'flex', gap: 4 }}>
            <LocalStringInput value={v} onCommit={v => update(i, v)} style={{ flex: 1 }} />
            {values.length > 1 && (
              <button onClick={() => remove(i)} style={styles.removeBtn}>×</button>
            )}
          </div>
        ))}
        <button onClick={add} style={styles.addBtn}>+ add</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  label: { width: 140, flexShrink: 0, color: 'var(--text-muted)', paddingTop: 4, fontSize: 12 },
  input: { flex: 1 },
  compositeItem: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
    padding: 8,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border)',
    borderRadius: 4,
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
    flexShrink: 0,
  },
};
