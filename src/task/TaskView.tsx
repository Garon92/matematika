import type { Answer, Operand, Rel, Task } from '../lib/types';
import { opSymbol, type Notation } from '../lib/notation';
import { expected } from '../lib/math';
import { plural } from '../lib/czech';
import { StarCanvas } from '../stars/StarCanvas';
import { Blocks } from './HintView';

export type Phase = 'input' | 'correct' | 'wrong' | 'revealed';

export interface InputState {
  value: string;
  remQ: string;
  remR: string;
  field: 0 | 1;
  picked: Rel | number | null;
}

function Slot({ text, phase, active, wide = false, onClick, label }: { text: string; phase: Phase; active: boolean; wide?: boolean; onClick?: () => void; label: string }) {
  const cls = phase === 'correct' ? 'is-correct' : phase === 'wrong' ? 'is-wrong' : phase === 'revealed' ? 'is-revealed' : active ? 'is-active' : '';
  return (
    <button type="button" className={`slot ${wide ? 'slot--wide' : ''} ${cls}`} onClick={onClick} aria-label={label} tabIndex={onClick ? 0 : -1}>
      <span className="slot__text">{text || (active && phase === 'input' ? '' : '?')}</span>
      {active && phase === 'input' && <span className="slot__caret" aria-hidden="true" />}
    </button>
  );
}

function shown(task: Task, input: InputState, phase: Phase): { value: string; q: string; r: string; rel: string } {
  const e = expected(task);
  if (phase === 'revealed') {
    if (e.kind === 'num') return { value: String(e.value), q: '', r: '', rel: '' };
    if (e.kind === 'rem') return { value: '', q: String(e.q), r: String(e.r), rel: '' };
    return { value: '', q: '', r: '', rel: e.value };
  }
  return {
    value: input.value,
    q: input.remQ,
    r: input.remR,
    rel: typeof input.picked === 'string' ? input.picked : '',
  };
}

function operandText(o: Operand, n: Notation): string {
  return o.kind === 'num' ? String(o.value) : `${o.a} ${opSymbol(o.op, n)} ${o.b}`;
}

export function TaskView({ task, input, phase, notation, onField }: {
  task: Task;
  input: InputState;
  phase: Phase;
  notation: Notation;
  onField?: (f: 0 | 1) => void;
}) {
  const s = shown(task, input, phase);
  switch (task.kind) {
    case 'expr': {
      const parts: React.ReactNode[] = [];
      const tok = (k: 'a' | 'b' | 'c') =>
        task.missing === k ? <Slot key={k} text={s.value} phase={phase} active label="Tvoje odpověď" /> : <span key={k}>{task[k]}</span>;
      parts.push(tok('a'), <span key="op" className="expr__op">{opSymbol(task.op, notation)}</span>, tok('b'), <span key="eq" className="expr__op">=</span>, tok('c'));
      const long = String(task.a).length + String(task.b).length + String(task.c).length > 6;
      return <div className={`expr ${long ? 'expr--long' : ''}`}>{parts}</div>;
    }
    case 'rem':
      return (
        <div className="expr expr--long flex-wrap">
          <span>{task.a}</span>
          <span className="expr__op">{opSymbol('div', notation)}</span>
          <span>{task.b}</span>
          <span className="expr__op">=</span>
          <Slot text={s.q} phase={phase} active={input.field === 0} onClick={() => onField?.(0)} label="Podíl" />
          <span className="expr__rem">zb.</span>
          <Slot text={s.r} phase={phase} active={input.field === 1} onClick={() => onField?.(1)} label="Zbytek" />
        </div>
      );
    case 'compare':
      return (
        <div className={`expr ${task.left.kind === 'expr' || task.right.kind === 'expr' ? 'expr--long' : ''}`}>
          <span className="whitespace-nowrap">{operandText(task.left, notation)}</span>
          <Slot text={s.rel} phase={phase} active label="Porovnání" />
          <span className="whitespace-nowrap">{operandText(task.right, notation)}</span>
        </div>
      );
    case 'count':
      return (
        <div className="flex h-full w-full flex-col items-center gap-3">
          <p className="task-question">Kolik je tu hvězdiček?</p>
          <div className="night-sky count-sky">
            <StarCanvas n={task.n} mode={task.frames ? 'ten' : 'scatter'} seed={task.seed} maxR={task.n <= 5 ? 30 : 24} className="h-full w-full" label="Hvězdičky k spočítání" />
          </div>
          {!task.choices && (
            <div className="expr expr--small">
              <Slot text={s.value} phase={phase} active label="Tvoje odpověď" />
            </div>
          )}
        </div>
      );
    case 'seq': {
      const items = Array.from({ length: task.length }, (_, i) => task.start + task.step * i);
      return (
        <div className="flex flex-col items-center gap-3">
          <p className="task-question">Které číslo chybí?</p>
          <div className="seq">
            {items.map((v, i) =>
              i === task.gap ? <Slot key={i} text={s.value} phase={phase} active label="Chybějící číslo" /> : <span key={i} className="seq__item">{v}</span>,
            )}
          </div>
        </div>
      );
    }
    case 'place':
      return (
        <div className="flex flex-col items-center gap-4">
          <Blocks values={[task.tens * 10 + task.units]} compact showValue={false} big />
          <div className="expr expr--small flex-wrap">
            <span className="place-label">
              {task.tens} {plural(task.tens, 'desítka', 'desítky', 'desítek')} a {task.units} {plural(task.units, 'jednotka', 'jednotky', 'jednotek')} =
            </span>
            <Slot text={s.value} phase={phase} active label="Číslo" />
          </div>
        </div>
      );
    case 'word': {
      const v = Number(s.value);
      const unit = s.value ? plural(v, task.unitForms[0], task.unitForms[1], task.unitForms[2]) : task.unitForms[2];
      const picture = task.a <= 10 && task.b <= 10 && (task.op === 'add' || task.op === 'sub');
      const groups = task.op === 'mul' && task.pic !== 'none' && task.a * task.b <= 40 && task.a <= 6;
      const pile = task.op === 'div' && task.a <= 30;
      return (
        <div className="flex w-full flex-col items-center gap-3">
          <p className="word-text">{task.text}</p>
          {picture && (
            <div className="word-pic" aria-hidden="true">
              <span className="word-pic__group">
                {Array.from({ length: task.a }, (_, i) => (
                  <span key={i} className={task.op === 'sub' && i >= task.a - task.b ? 'is-gone' : ''}>
                    {task.icon}
                  </span>
                ))}
              </span>
              {task.op === 'add' && (
                <>
                  <b>+</b>
                  <span className="word-pic__group">
                    {Array.from({ length: task.b }, (_, i) => (
                      <span key={i}>{task.icon}</span>
                    ))}
                  </span>
                </>
              )}
            </div>
          )}
          {groups && (
            <div className="word-pic" aria-hidden="true">
              {Array.from({ length: task.a }, (_, g) => (
                <span key={g} className="word-pic__group word-pic__box">
                  {Array.from({ length: task.b }, (_, i) => (
                    <span key={i}>{task.icon}</span>
                  ))}
                </span>
              ))}
            </div>
          )}
          {pile && (
            <div className="word-pic" aria-hidden="true">
              <span className="word-pic__group word-pic__pile">
                {Array.from({ length: task.a }, (_, i) => (
                  <span key={i}>{task.icon}</span>
                ))}
              </span>
            </div>
          )}
          <div className="expr expr--small">
            <Slot text={s.value} phase={phase} active label="Odpověď" />
            <span className="word-unit">{unit}</span>
          </div>
        </div>
      );
    }
  }
}

/** Builds the Answer object from the current input. */
export function currentAnswer(task: Task, input: InputState): Answer | null {
  if (task.kind === 'compare') return typeof input.picked === 'string' ? { kind: 'rel', value: input.picked } : null;
  if (task.kind === 'rem') {
    if (input.remQ === '' || input.remR === '') return null;
    return { kind: 'rem', q: Number(input.remQ), r: Number(input.remR) };
  }
  if (task.kind === 'count' && task.choices && typeof input.picked === 'number') return { kind: 'num', value: input.picked };
  if (input.value === '') return null;
  return { kind: 'num', value: Number(input.value) };
}
