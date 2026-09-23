import * as g from './generators';
import type { Gen } from './generators';
import { wordProblem } from './words';

export type AreaId = 'count' | 'add' | 'sub' | 'mul' | 'div' | 'mix';

export interface Area {
  id: AreaId;
  title: string;
  /** Big symbol shown on the tile. */
  symbol: string;
  desc: string;
  /** Levels unlock one by one (1★ in the previous level). */
  sequential: boolean;
}

export interface LevelDef {
  id: string;
  area: AreaId;
  title: string;
  /** Short example shown inside the level node (school notation). */
  sample: string;
  /** One-line description for parents. */
  desc: string;
  gen: Gen;
}

export const AREAS: readonly Area[] = [
  { id: 'count', title: 'Počítání', symbol: '123', desc: 'Počítání hvězd, porovnávání, číselná řada', sequential: true },
  { id: 'add', title: 'Sčítání', symbol: '+', desc: 'Od 5 až po 100, přes desítku, slovní úlohy', sequential: true },
  { id: 'sub', title: 'Odčítání', symbol: '−', desc: 'Od 5 až po 100, přes desítku, slovní úlohy', sequential: true },
  { id: 'mul', title: 'Násobilka', symbol: '·', desc: 'Řady 0–10, celá násobilka, slovní úlohy', sequential: false },
  { id: 'div', title: 'Dělení', symbol: ':', desc: 'Řady 1–10, se zbytkem, slovní úlohy', sequential: false },
  { id: 'mix', title: 'Mix', symbol: '±', desc: 'Všechno dohromady a porovnávání příkladů', sequential: false },
];

const L = (area: AreaId, id: string, title: string, sample: string, desc: string, gen: Gen): LevelDef => ({
  id,
  area,
  title,
  sample,
  desc,
  gen,
});

export const LEVELS: readonly LevelDef[] = [
  // ------------------------------------------------------------ counting
  L('count', 'count-5', 'Spočítej do 5', '1 2 3 4 5', 'Kolik je hvězdiček? (1–5, výběr ze tří)', g.countStars(1, 5, { choices: true, frames: false })),
  L('count', 'count-10', 'Spočítej do 10', '1 … 10', 'Kolik je hvězdiček? (3–10, výběr ze tří)', g.countStars(3, 10, { choices: true, frames: false })),
  L('count', 'count-20', 'Spočítej do 20', '1 … 20', 'Hvězdy v desítkových rámečcích (8–20)', g.countStars(8, 20, { choices: false, frames: true })),
  L('count', 'cmp-10', 'Porovnej do 10', '3 < 7', 'Větší, menší, nebo stejné? (0–10)', g.compareNumbers(10)),
  L('count', 'seq-20', 'Číselná řada', '4, 5, ?', 'Které číslo chybí? (do 20, i pozpátku)', g.sequence(20, [1])),
  L('count', 'cmp-20', 'Porovnej do 20', '12 > 9', 'Porovnávání čísel do 20', g.compareNumbers(20)),
  L('count', 'place', 'Desítky a jednotky', '4D 7J', 'Složení čísla z desítek a jednotek', g.placeValue()),
  L('count', 'seq-100', 'Po dvou, pěti, deseti', '10, 20, ?', 'Číselná řada po 2, 5 a 10 do 100', g.sequence(100, [2, 5, 10])),
  L('count', 'cmp-100', 'Porovnej do 100', '46 < 64', 'Porovnávání čísel do 100 (stejné desítky, přehozené číslice)', g.compareNumbers(100)),

  // ------------------------------------------------------------ addition
  L('add', 'add-5', 'Sčítání do 5', '2 + 3', 'Součet nejvýš 5', g.addWithin(5)),
  L('add', 'add-10', 'Sčítání do 10', '4 + 5', 'Součet nejvýš 10', g.addWithin(10, 3)),
  L('add', 'add-make10', 'Kamarádi desítky', '7 + ? = 10', 'Doplň do deseti', g.makeTen()),
  L('add', 'add-20', 'Do 20 bez přechodu', '13 + 4', 'Sčítání do 20 bez přechodu přes desítku', g.addNoCarry20()),
  L('add', 'add-20c', 'Do 20 přes desítku', '8 + 5', 'Sčítání s přechodem přes desítku', g.addCarry20()),
  L('add', 'add-miss20', 'Chybějící číslo', '? + 6 = 14', 'Doplň chybějící sčítanec (do 20)', g.addMissing(20)),
  L('add', 'add-tens', 'Celé desítky', '30 + 40', 'Sčítání celých desítek do 100', g.addTens()),
  L('add', 'add-100', 'Do 100 bez přechodu', '34 + 25', 'Dvouciferná čísla bez přechodu', g.add100(false)),
  L('add', 'add-100c', 'Do 100 s přechodem', '38 + 47', 'Dvouciferná čísla s přechodem přes desítku', g.add100(true)),
  L('add', 'add-word', 'Slovní úlohy', '🍎 + 🍎', 'Slovní úlohy na sčítání do 20', wordProblem(['add'], 20)),

  // ------------------------------------------------------------ subtraction
  L('sub', 'sub-5', 'Odčítání do 5', '5 − 2', 'Odčítání v oboru do 5', g.subWithin(5)),
  L('sub', 'sub-10', 'Odčítání do 10', '9 − 4', 'Odčítání v oboru do 10', g.subWithin(10)),
  L('sub', 'sub-20', 'Do 20 bez přechodu', '17 − 4', 'Odčítání do 20 bez přechodu přes desítku', g.subNoBorrow20()),
  L('sub', 'sub-20b', 'Do 20 přes desítku', '13 − 5', 'Odčítání s přechodem přes desítku', g.subBorrow20()),
  L('sub', 'sub-miss20', 'Chybějící číslo', '12 − ? = 5', 'Doplň chybějící číslo (do 20)', g.subMissing(20)),
  L('sub', 'sub-tens', 'Celé desítky', '70 − 30', 'Odčítání celých desítek', g.subTens()),
  L('sub', 'sub-100', 'Do 100 bez přechodu', '58 − 23', 'Dvouciferná čísla bez přechodu', g.sub100(false)),
  L('sub', 'sub-100b', 'Do 100 s přechodem', '52 − 17', 'Dvouciferná čísla s přechodem přes desítku', g.sub100(true)),
  L('sub', 'sub-word', 'Slovní úlohy', '🍎 − 🍎', 'Slovní úlohy na odčítání do 20', wordProblem(['sub'], 20)),

  // ------------------------------------------------------------ multiplication
  L('mul', 'mul-2', 'Násobilka 2', '2 · 3', 'Řada 2', g.mulRow([2])),
  L('mul', 'mul-3', 'Násobilka 3', '3 · 4', 'Řada 3', g.mulRow([3])),
  L('mul', 'mul-4', 'Násobilka 4', '4 · 5', 'Řada 4', g.mulRow([4])),
  L('mul', 'mul-5', 'Násobilka 5', '5 · 6', 'Řada 5', g.mulRow([5])),
  L('mul', 'mul-10', 'Násobilka 10', '10 · 7', 'Řada 10', g.mulRow([10])),
  L('mul', 'mul-01', 'Krát 0 a krát 1', '1 · 8', 'Násobení nulou a jedničkou', g.mulZeroOne()),
  L('mul', 'mul-6', 'Násobilka 6', '6 · 3', 'Řada 6', g.mulRow([6])),
  L('mul', 'mul-7', 'Násobilka 7', '7 · 4', 'Řada 7', g.mulRow([7])),
  L('mul', 'mul-8', 'Násobilka 8', '8 · 6', 'Řada 8', g.mulRow([8])),
  L('mul', 'mul-9', 'Násobilka 9', '9 · 7', 'Řada 9', g.mulRow([9])),
  L('mul', 'mul-all', 'Celá násobilka', '7 · 8', 'Náhodně celá malá násobilka', g.mulAll()),
  L('mul', 'mul-miss', 'Chybějící činitel', '4 · ? = 28', 'Doplň chybějící číslo', g.mulMissing()),
  L('mul', 'mul-word', 'Slovní úlohy', '🐕 · 4', 'Slovní úlohy na násobení', wordProblem(['mul'], 10)),

  // ------------------------------------------------------------ division
  L('div', 'div-2', 'Dělení 2', '8 : 2', 'Dělení dvěma', g.divRow([2])),
  L('div', 'div-3', 'Dělení 3', '12 : 3', 'Dělení třemi', g.divRow([3])),
  L('div', 'div-4', 'Dělení 4', '20 : 4', 'Dělení čtyřmi', g.divRow([4])),
  L('div', 'div-5', 'Dělení 5', '30 : 5', 'Dělení pěti', g.divRow([5])),
  L('div', 'div-10', 'Dělení 10 a 1', '60 : 10', 'Dělení deseti a jedničkou', g.divRow([10, 10, 1])),
  L('div', 'div-6', 'Dělení 6', '36 : 6', 'Dělení šesti', g.divRow([6])),
  L('div', 'div-7', 'Dělení 7', '28 : 7', 'Dělení sedmi', g.divRow([7])),
  L('div', 'div-8', 'Dělení 8', '48 : 8', 'Dělení osmi', g.divRow([8])),
  L('div', 'div-9', 'Dělení 9', '63 : 9', 'Dělení devíti', g.divRow([9])),
  L('div', 'div-all', 'Celé dělení', '56 : 7', 'Náhodně celé dělení v oboru násobilky', g.divAll()),
  L('div', 'div-miss', 'Chybějící číslo', '? : 4 = 6', 'Doplň dělence nebo dělitele', g.divMissing()),
  L('div', 'div-rem', 'Dělení se zbytkem', '17 : 5', 'Podíl a zbytek (pro pokročilé)', g.divRemainder()),
  L('div', 'div-word', 'Slovní úlohy', '🍬 : 🧒', 'Slovní úlohy na dělení', wordProblem(['div'], 10)),

  // ------------------------------------------------------------ mix
  L('mix', 'mix-10', '+ a − do 10', '6 − 2 + …', 'Sčítání a odčítání do 10', g.mix([g.addWithin(10, 3), g.subWithin(10)])),
  L(
    'mix',
    'mix-20',
    '+ a − do 20',
    '14 − 6',
    'Sčítání a odčítání do 20 (i přes desítku)',
    g.mix([g.addNoCarry20(), g.addCarry20(), g.subNoBorrow20(), g.subBorrow20(), g.addMissing(20), g.subMissing(20)], [2, 3, 2, 3, 1, 1]),
  ),
  L('mix', 'mix-cmp', 'Porovnej příklady', '3 + 4 ? 8', 'Porovnání příkladu s číslem nebo s jiným příkladem', g.compareExpressions(20)),
  L(
    'mix',
    'mix-100',
    '+ a − do 100',
    '45 + 38',
    'Sčítání a odčítání dvouciferných čísel',
    g.mix([g.add100(false), g.add100(true), g.sub100(false), g.sub100(true), g.addTens(), g.subTens()], [2, 3, 2, 3, 1, 1]),
  ),
  L('mix', 'mix-md', 'Násobení a dělení', '6 · 7, 42 : 6', 'Celá násobilka i dělení', g.mix([g.mulAll(), g.divAll(), g.mulMissing(), g.divMissing()], [3, 3, 1, 1])),
  L('mix', 'mix-cmp2', 'Porovnej s násobilkou', '3 · 4 ? 13', 'Porovnání příkladů na násobení a dělení', g.compareExpressions(20, ['mul', 'div'])),
  L('mix', 'mix-word', 'Slovní úlohy mix', '🍎 ? 🍎', 'Slovní úlohy na všechny operace', wordProblem(['add', 'sub', 'mul', 'div'], 20)),
  L(
    'mix',
    'mix-all',
    'Velký mix',
    '+ − · :',
    'Všechno dohromady',
    g.mix([g.add100(true), g.sub100(true), g.addCarry20(), g.subBorrow20(), g.mulAll(), g.divAll(), g.compareExpressions(100)], [2, 2, 1, 1, 2, 2, 1]),
  ),
];

const byId = new Map(LEVELS.map((l) => [l.id, l]));

export function levelById(id: string): LevelDef | undefined {
  return byId.get(id);
}

export function areaById(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}

export function levelsOf(area: AreaId): LevelDef[] {
  return LEVELS.filter((l) => l.area === area);
}

/** Converts a school-notation sample ("7 · 8", "56 : 7") to the chosen notation. */
export function sampleIn(sample: string, notation: 'school' | 'intl'): string {
  if (notation === 'school') return sample;
  return sample.replace(/ · /g, ' × ').replace(/ : /g, ' ÷ ').replace(/^· /, '× ');
}
