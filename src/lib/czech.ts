/** Czech language helpers: plural forms and number → words. */

/** Czech plural: 1 → one, 2–4 → few, 0 and 5+ → many. */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n);
  if (a === 1) return one;
  if (a >= 2 && a <= 4) return few;
  return many;
}

const UNITS = ['nula', 'jedna', 'dva', 'tři', 'čtyři', 'pět', 'šest', 'sedm', 'osm', 'devět'];
const TEENS = [
  'deset', 'jedenáct', 'dvanáct', 'třináct', 'čtrnáct',
  'patnáct', 'šestnáct', 'sedmnáct', 'osmnáct', 'devatenáct',
];
const TENS = ['', '', 'dvacet', 'třicet', 'čtyřicet', 'padesát', 'šedesát', 'sedmdesát', 'osmdesát', 'devadesát'];
const HUNDREDS = [
  '', 'sto', 'dvě stě', 'tři sta', 'čtyři sta', 'pět set', 'šest set', 'sedm set', 'osm set', 'devět set',
];

function below100(n: number): string {
  if (n < 10) return UNITS[n]!;
  if (n < 20) return TEENS[n - 10]!;
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? TENS[t]! : `${TENS[t]} ${UNITS[u]}`;
}

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(HUNDREDS[h]!);
  if (rest > 0 || h === 0) parts.push(below100(rest));
  return parts.join(' ');
}

/** Count word for masculine nouns (tisíc, milion): 1 → '', 2 → 'dva'. */
function countPrefix(n: number): string {
  if (n === 1) return '';
  return below1000(n);
}

function bigUnit(n: number, one: string, few: string, many: string): string {
  // 2–4 take "few" form only when the whole count is 2–4 (dva tisíce), compounds like 22 use "many".
  const form = n === 1 ? one : n >= 2 && n <= 4 ? few : many;
  const prefix = countPrefix(n);
  return prefix ? `${prefix} ${form}` : form;
}

/** Converts 0 … 999 999 999 to Czech words (cardinal, as used when counting: "jedna, dva, tři"). */
export function numberToWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'nula';
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  n %= 1_000_000;
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  if (millions > 0) parts.push(bigUnit(millions, 'milion', 'miliony', 'milionů'));
  if (thousands > 0) parts.push(bigUnit(thousands, 'tisíc', 'tisíce', 'tisíc'));
  if (rest > 0) parts.push(below1000(rest));
  const words = parts.join(' ');
  return value < 0 ? `mínus ${words}` : words;
}

const fmt = new Intl.NumberFormat('cs-CZ');
/** 1234567 → "1 234 567" (Czech grouping with non-breaking spaces). */
export function formatNumber(n: number): string {
  return fmt.format(n);
}

/** Place value breakdown for 0–9999: [{value, label}] e.g. 3 desítky, 7 jednotek. */
export function placeValue(n: number): { count: number; label: string; unit: 'tisíce' | 'stovky' | 'desítky' | 'jednotky' }[] {
  const out: { count: number; label: string; unit: 'tisíce' | 'stovky' | 'desítky' | 'jednotky' }[] = [];
  const th = Math.floor(n / 1000);
  const h = Math.floor((n % 1000) / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  if (n >= 1000) out.push({ count: th, label: plural(th, 'tisíc', 'tisíce', 'tisíců'), unit: 'tisíce' });
  if (n >= 100) out.push({ count: h, label: plural(h, 'stovka', 'stovky', 'stovek'), unit: 'stovky' });
  if (n >= 10) out.push({ count: t, label: plural(t, 'desítka', 'desítky', 'desítek'), unit: 'desítky' });
  out.push({ count: u, label: plural(u, 'jednotka', 'jednotky', 'jednotek'), unit: 'jednotky' });
  return out;
}

/** "hvězda / hvězdy / hvězd" helper for UI. */
export function starsWord(n: number): string {
  return plural(n, 'hvězda', 'hvězdy', 'hvězd');
}
