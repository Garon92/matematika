/** Czech word problems (slovní úlohy) with correct declension after numerals. */
import { chance, pick, randInt, type Rng } from './rng';
import type { Op, WordTask } from './types';
import { plural } from './czech';
import type { Gen } from './generators';

type Gender = 'm' | 'f';

interface Person {
  name: string;
  g: Gender;
}

const PEOPLE: readonly Person[] = [
  { name: 'Adámek', g: 'm' },
  { name: 'Tomáš', g: 'm' },
  { name: 'Kuba', g: 'm' },
  { name: 'Matěj', g: 'm' },
  { name: 'Vojta', g: 'm' },
  { name: 'Filip', g: 'm' },
  { name: 'Ondra', g: 'm' },
  { name: 'Ema', g: 'f' },
  { name: 'Anička', g: 'f' },
  { name: 'Eliška', g: 'f' },
  { name: 'Klárka', g: 'f' },
  { name: 'Natálka', g: 'f' },
  { name: 'Terezka', g: 'f' },
  { name: 'Sofie', g: 'f' },
];

export interface Item {
  icon: string;
  /** nominative singular: "je 1 hruška" */
  nom1: string;
  /** accusative singular: "má 1 hrušku" */
  acc1: string;
  /** 2–4 (nominative = accusative for these nouns): "3 hrušky" */
  few: string;
  /** 5+ and after "kolik": "5 hrušek" */
  many: string;
  edible?: boolean;
  collect?: boolean;
}

export const ITEMS: readonly Item[] = [
  { icon: '🍎', nom1: 'jablko', acc1: 'jablko', few: 'jablka', many: 'jablek', edible: true, collect: true },
  { icon: '🍐', nom1: 'hruška', acc1: 'hrušku', few: 'hrušky', many: 'hrušek', edible: true, collect: true },
  { icon: '🍓', nom1: 'jahoda', acc1: 'jahodu', few: 'jahody', many: 'jahod', edible: true, collect: true },
  { icon: '🍬', nom1: 'bonbon', acc1: 'bonbon', few: 'bonbony', many: 'bonbonů', edible: true },
  { icon: '🍪', nom1: 'sušenka', acc1: 'sušenku', few: 'sušenky', many: 'sušenek', edible: true },
  { icon: '🍌', nom1: 'banán', acc1: 'banán', few: 'banány', many: 'banánů', edible: true },
  { icon: '🎈', nom1: 'balónek', acc1: 'balónek', few: 'balónky', many: 'balónků' },
  { icon: '🚗', nom1: 'autíčko', acc1: 'autíčko', few: 'autíčka', many: 'autíček' },
  { icon: '🖍️', nom1: 'pastelka', acc1: 'pastelku', few: 'pastelky', many: 'pastelek' },
  { icon: '🌷', nom1: 'kytička', acc1: 'kytičku', few: 'kytičky', many: 'kytiček', collect: true },
  { icon: '📘', nom1: 'knížka', acc1: 'knížku', few: 'knížky', many: 'knížek' },
  { icon: '⚽', nom1: 'míček', acc1: 'míček', few: 'míčky', many: 'míčků' },
  { icon: '⭐', nom1: 'hvězdička', acc1: 'hvězdičku', few: 'hvězdičky', many: 'hvězdiček' },
  { icon: '🐚', nom1: 'mušle', acc1: 'mušli', few: 'mušle', many: 'mušlí', collect: true },
  { icon: '🌰', nom1: 'kaštan', acc1: 'kaštan', few: 'kaštany', many: 'kaštanů', collect: true },
  { icon: '🧱', nom1: 'kostička', acc1: 'kostičku', few: 'kostičky', many: 'kostiček' },
];

interface Container {
  nom1: string;
  acc1: string;
  few: string;
  many: string;
  /** "V každém sáčku" */
  each: string;
  /** "do sáčků" */
  into: string;
}

const CONTAINERS: readonly Container[] = [
  { nom1: 'sáček', acc1: 'sáček', few: 'sáčky', many: 'sáčků', each: 'V každém sáčku', into: 'do sáčků' },
  { nom1: 'krabička', acc1: 'krabičku', few: 'krabičky', many: 'krabiček', each: 'V každé krabičce', into: 'do krabiček' },
  { nom1: 'talíř', acc1: 'talíř', few: 'talíře', many: 'talířů', each: 'Na každém talíři', into: 'na talíře' },
  { nom1: 'košík', acc1: 'košík', few: 'košíky', many: 'košíků', each: 'V každém košíku', into: 'do košíků' },
];

/** "3 hrušky" — accusative (what someone has) or nominative (what there is). */
export function qty(n: number, item: Pick<Item, 'nom1' | 'acc1' | 'few' | 'many'>, kase: 'nom' | 'acc' = 'acc'): string {
  return `${n} ${plural(n, kase === 'nom' ? item.nom1 : item.acc1, item.few, item.many)}`;
}

/** Verb "být" agreeing with a numeral subject: je 1 / jsou 3 / je 5. */
export function be(n: number): string {
  return n >= 2 && n <= 4 ? 'jsou' : 'je';
}

/** Past tense by gender: v(p, 'měl', 'měla'). */
function v(p: Person, m: string, f: string): string {
  return p.g === 'm' ? m : f;
}

function dative(p: Person): string {
  return p.g === 'm' ? 'mu' : 'jí';
}

function twoPeople(rng: Rng): [Person, Person] {
  const a = pick(rng, PEOPLE);
  let b = pick(rng, PEOPLE);
  for (let i = 0; i < 20 && b.name === a.name; i++) b = pick(rng, PEOPLE);
  return [a, b];
}

function unitForms(item: Pick<Item, 'nom1' | 'few' | 'many'>): [string, string, string] {
  return [item.nom1, item.few, item.many];
}

/** Czech typography: no one-letter preposition at a line end, numbers stick to their noun. */
export function nbsp(text: string): string {
  // No regex lookbehind (Safari < 16.4 can't parse it) – repeat until stable so chains like "a k v lese" all stick.
  let out = text;
  for (let prev = ''; prev !== out; ) {
    prev = out;
    out = out.replace(/(^|\s)([vVkKsSzZoOuUaAiI])[^\S\u00A0]/g, '$1$2\u00A0');
  }
  return out.replace(/(\d+) /g, '$1\u00A0');
}

function task(op: Op, a: number, b: number, answer: number, text: string, icon: string, forms: [string, string, string]): WordTask {
  return { kind: 'word', op, a, b, answer, text: nbsp(text), icon, unit: forms[2], unitForms: forms };
}

// ---------------------------------------------------------------- templates

function addition(rng: Rng, a: number, b: number): WordTask {
  const t = randInt(rng, 0, 3);
  const p = pick(rng, PEOPLE);
  if (t === 0) {
    const it = pick(rng, ITEMS);
    const text = `${p.name} má ${qty(a, it)}. ${cap(v(p, 'dostal', 'dostala'))} ještě ${qty(b, it)}. Kolik ${it.many} má teď?`;
    return task('add', a, b, a + b, text, it.icon, unitForms(it));
  }
  if (t === 1) {
    const it = pick(rng, ITEMS);
    const text = `Na stole ${be(a)} ${qty(a, it, 'nom')}. Maminka přinesla ještě ${qty(b, it)}. Kolik ${it.many} je teď na stole?`;
    return task('add', a, b, a + b, text, it.icon, unitForms(it));
  }
  if (t === 2) {
    const it = pick(rng, ITEMS);
    const [p1, p2] = twoPeople(rng);
    const text = `${p1.name} má ${qty(a, it)} a ${p2.name} má ${qty(b, it)}. Kolik ${it.many} mají dohromady?`;
    return task('add', a, b, a + b, text, it.icon, unitForms(it));
  }
  const it = pick(rng, ITEMS.filter((i) => i.collect));
  const verb = v(p, 'nasbíral', 'nasbírala');
  const text = `${p.name} ${verb} ráno ${qty(a, it)} a odpoledne ještě ${qty(b, it)}. Kolik ${it.many} ${verb} celkem?`;
  return task('add', a, b, a + b, text, it.icon, unitForms(it));
}

function subtraction(rng: Rng, a: number, b: number): WordTask {
  const t = randInt(rng, 0, 3);
  const p = pick(rng, PEOPLE);
  if (t === 0) {
    const it = pick(rng, ITEMS);
    const friend = chance(rng, 0.5) ? 'kamarádovi' : 'kamarádce';
    const text = `${p.name} ${v(p, 'měl', 'měla')} ${qty(a, it)}. ${cap(v(p, 'dal', 'dala'))} ${qty(b, it)} ${friend}. Kolik ${it.many} ${dative(p)} zbylo?`;
    return task('sub', a, b, a - b, text, it.icon, unitForms(it));
  }
  if (t === 1) {
    const it = pick(rng, ITEMS.filter((i) => i.edible));
    const text = `${p.name} ${v(p, 'měl', 'měla')} ${qty(a, it)} a ${v(p, 'snědl', 'snědla')} ${qty(b, it)}. Kolik ${it.many} ${dative(p)} zbylo?`;
    return task('sub', a, b, a - b, text, it.icon, unitForms(it));
  }
  if (t === 2) {
    const it = pick(rng, ITEMS);
    const text = `V krabici ${be(a)} ${qty(a, it, 'nom')}. ${p.name} ${v(p, 'vzal', 'vzala')} ${qty(b, it)}. Kolik ${it.many} zůstalo v krabici?`;
    return task('sub', a, b, a - b, text, it.icon, unitForms(it));
  }
  // difference ("o kolik víc") needs a > b
  if (a === b) return subtraction(rng, a, Math.max(0, b - 1));
  const it = pick(rng, ITEMS);
  const [p1, p2] = twoPeople(rng);
  const text = `${p1.name} má ${qty(a, it)} a ${p2.name} má ${qty(b, it)}. O kolik ${it.many} má ${p1.name} víc?`;
  return task('sub', a, b, a - b, text, it.icon, unitForms(it));
}

interface FixedGroup {
  one: string;
  /** "mají 3 psi" */
  few: string;
  /** "má 5 psů" */
  many: string;
  per: number;
  part: Pick<Item, 'nom1' | 'acc1' | 'few' | 'many'>;
  icon: string;
  intro: string;
}

const FIXED: readonly FixedGroup[] = [
  { intro: 'Jedno auto má', one: 'auto', few: 'auta', many: 'aut', per: 4, part: { nom1: 'kolo', acc1: 'kolo', few: 'kola', many: 'kol' }, icon: '🚗' },
  { intro: 'Jeden pes má', one: 'pes', few: 'psi', many: 'psů', per: 4, part: { nom1: 'noha', acc1: 'nohu', few: 'nohy', many: 'nohou' }, icon: '🐕' },
  { intro: 'Jedna kočka má', one: 'kočka', few: 'kočky', many: 'koček', per: 4, part: { nom1: 'noha', acc1: 'nohu', few: 'nohy', many: 'nohou' }, icon: '🐈' },
  { intro: 'Jeden pavouk má', one: 'pavouk', few: 'pavouci', many: 'pavouků', per: 8, part: { nom1: 'noha', acc1: 'nohu', few: 'nohy', many: 'nohou' }, icon: '🕷️' },
  { intro: 'Jedna ruka má', one: 'ruka', few: 'ruce', many: 'rukou', per: 5, part: { nom1: 'prst', acc1: 'prst', few: 'prsty', many: 'prstů' }, icon: '✋' },
  { intro: 'Jeden týden má', one: 'týden', few: 'týdny', many: 'týdnů', per: 7, part: { nom1: 'den', acc1: 'den', few: 'dny', many: 'dní' }, icon: '📅' },
  { intro: 'Jeden pár má', one: 'pár', few: 'páry', many: 'párů', per: 2, part: { nom1: 'ponožka', acc1: 'ponožku', few: 'ponožky', many: 'ponožek' }, icon: '🧦' },
  { intro: 'Jedna ještěrka má', one: 'ještěrka', few: 'ještěrky', many: 'ještěrek', per: 4, part: { nom1: 'noha', acc1: 'nohu', few: 'nohy', many: 'nohou' }, icon: '🦎' },
  { intro: 'Jeden trojúhelník má', one: 'trojúhelník', few: 'trojúhelníky', many: 'trojúhelníků', per: 3, part: { nom1: 'roh', acc1: 'roh', few: 'rohy', many: 'rohů' }, icon: '🔺' },
  { intro: 'Jedna hvězda má', one: 'hvězda', few: 'hvězdy', many: 'hvězd', per: 5, part: { nom1: 'cíp', acc1: 'cíp', few: 'cípy', many: 'cípů' }, icon: '⭐' },
];

function multiplication(rng: Rng, a: number, b: number): WordTask {
  // a groups of b
  const fixed = FIXED.filter((f) => f.per === b);
  if (fixed.length > 0 && a >= 2 && chance(rng, 0.45)) {
    const f = pick(rng, fixed);
    const verb = a >= 2 && a <= 4 ? 'mají' : 'má';
    const who = plural(a, f.one, f.few, f.many);
    const text = `${f.intro} ${qty(b, f.part)}. Kolik ${f.part.many} ${verb} ${a} ${who}?`;
    return { ...task('mul', a, b, a * b, text, f.icon, unitForms(f.part)), pic: 'none' };
  }
  const p = pick(rng, PEOPLE);
  if (a >= 2 && chance(rng, 0.25)) {
    const it = pick(rng, ITEMS.filter((i) => i.edible));
    const text = `${p.name} ${v(p, 'koupil', 'koupila')} ${qty(a, it)} po ${b} ${plural(b, 'koruně', 'korunách', 'korunách')}. Kolik korun ${v(p, 'zaplatil', 'zaplatila')}?`;
    return task('mul', a, b, a * b, text, '🪙', ['koruna', 'koruny', 'korun']);
  }
  const it = pick(rng, ITEMS);
  const c = pick(rng, CONTAINERS);
  const text = `${p.name} má ${qty(a, c)}. ${c.each} ${be(b)} ${qty(b, it, 'nom')}. Kolik ${it.many} má celkem?`;
  return task('mul', a, b, a * b, text, it.icon, unitForms(it));
}

function division(rng: Rng, a: number, b: number): WordTask {
  // a : b = q, a ≥ 2, b ≥ 2
  const q = a / b;
  const p = pick(rng, PEOPLE);
  const it = pick(rng, ITEMS);
  const had = v(p, 'měl', 'měla');
  if (chance(rng, 0.55)) {
    const kids = plural(b, 'dítě', 'děti', 'dětí');
    const text = `${p.name} ${had} ${qty(a, it)} a ${v(p, 'rozdělil', 'rozdělila')} je spravedlivě mezi ${b} ${kids}. Kolik ${it.many} dostalo každé dítě?`;
    return task('div', a, b, q, text, it.icon, unitForms(it));
  }
  const c = pick(rng, CONTAINERS.filter((x) => x.into.startsWith('do')));
  const each = c.nom1 === 'krabička' ? 'do každé' : 'do každého';
  const text = `${p.name} ${had} ${qty(a, it)} a ${v(p, 'dával', 'dávala')} je ${c.into}, ${each} ${qty(b, it)}. Kolik ${c.many} ${v(p, 'naplnil', 'naplnila')}?`;
  return task('div', a, b, q, text, it.icon, [c.nom1, c.few, c.many]);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Word problem generator for an operation with numbers up to `max`. */
export function wordProblem(ops: readonly Op[], max: number): Gen {
  return (rng) => {
    const op = pick(rng, ops);
    if (op === 'add') {
      const a = randInt(rng, 2, max - 2);
      const b = randInt(rng, 1, Math.min(max - a, max <= 20 ? 9 : max));
      return addition(rng, a, b);
    }
    if (op === 'sub') {
      const a = randInt(rng, 4, max);
      const b = randInt(rng, 1, a - 1);
      return subtraction(rng, a, b);
    }
    if (op === 'mul') {
      const a = randInt(rng, 2, Math.min(10, max));
      const b = randInt(rng, 2, 10);
      return multiplication(rng, a, b);
    }
    const b = randInt(rng, 2, Math.min(10, max));
    const q = randInt(rng, 2, 10);
    return division(rng, b * q, b);
  };
}
