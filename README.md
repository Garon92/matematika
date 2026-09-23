# Matematika – počítání s Hvězdičkou

Hravá aplikace na procvičování matematiky pro děti zhruba od 5 do 9 let. Součást rodiny aplikací
[garon92.github.io](https://garon92.github.io/) – běží na <https://garon92.github.io/matematika/>.

## Co umí

- **Úrovně s hvězdičkami** v šesti oblastech (62 úrovní):
  - **Počítání** – spočítej hvězdy (do 5, 10, 20), porovnávání (do 10, 20, 100), číselná řada, desítky a jednotky, řady po 2/5/10.
  - **Sčítání** a **Odčítání** – do 5, do 10, kamarádi desítky, do 20 bez přechodu / přes desítku, chybějící číslo, celé desítky, do 100 bez přechodu / s přechodem, slovní úlohy.
  - **Násobilka** – řady 2–10, krát 0 a 1, celá násobilka, chybějící činitel, slovní úlohy.
  - **Dělení** – řady 1–10, celé dělení, chybějící číslo, dělení se zbytkem, slovní úlohy.
  - **Mix** – + a − do 10/20/100, násobení a dělení, porovnávání příkladů, velký mix, slovní úlohy.
- **Cvičení po 10 příkladech** (nastavitelné): velká číselná klávesnice, okamžitá zpětná vazba, maskot Hvězdička,
  zvuky. Po 2. chybě se sama ukáže **nápověda** (hvězdy v desítkových rámečcích, číselná osa se skoky přes desítku,
  řady pro násobení a dělení), po 3. chybě se ukáže správný výsledek.
- **Hvězdy 0–3** podle počtu správných odpovědí napoprvé; hvězda odemkne další úroveň (násobilka a dělení jsou otevřené celé).
- **Chyby k procvičení** – co se nepovedlo, vrací se podle Leitnerových krabiček (dnes, zítra, za 3 a za 7 dní).
- **Denní cíl a série dní** (sdílené s rozcestníkem garon92), **Závod s časem** (60 s, rekordy, hvězdy),
  **Volný trénink** (původní „počítadlo“: operace + rozsah 5–100, skóre, Enter/Esc).
- **Hvězdné nebe** – až 10 milionů hvězd (Canvas 2D s animací, nad 8 000 WebGL2), rozložení rozházené / po pěti /
  desítkové rámečky / stovky, číslo slovy a rozklad na desítky a jednotky, ovládání tlačítky ±, kolečkem (Alt ×10,
  Ctrl ×100, Shift ×1000), tažením prstem a štípnutím.
- **Hvězdná kalkulačka** – A + − · : B = C z hvězdiček (A zlaté, B modré), odčítání s přeškrtnutými hvězdami,
  dělení se zbytkem, režim „Hádej výsledek“.
- **Předčítání česky** (Web Speech API – jen když má zařízení český hlas), notace `·` a `:` jako ve škole
  (přepínatelná na `×` a `÷`), světlý i tmavý vzhled, PWA (funguje offline, dá se nainstalovat).
- **Pro rodiče** (otevře se podržením tlačítka): přehled posledních 14 dní, úspěšnost podle operací, nejčastější chyby,
  postup v úrovních, nastavení (délka cvičení, denní cíl, nápověda, předčítání, klávesnice, odemknutí všech úrovní),
  záloha a obnovení postupu.

Staré adresy `pocitadlo.html`, `hvezdy.html` a `hvezdy-pocitadlo.html` přesměrují na nové obrazovky.

## Vývoj

```bash
npm install
npm run dev        # http://localhost:5171/matematika/
npm test           # Vitest – generátory příkladů, úrovně, hvězdy, chyby, skloňování, rozložení hvězd
npm run typecheck
npm run build      # → dist/
npm run preview
```

Stack: Vite 8, React 19, TypeScript (strict), Tailwind CSS 4, vite-plugin-pwa, Vitest.
Sdílený design systém **g92 kit** je vendorovaný v `src/kit/` – needitovat, aktualizuje se
`bash ~/AI/garon92-pages/menu/kit/sync.sh matematika`.

### Struktura

- `src/lib/` – čistá logika bez UI (generátory úloh, úrovně, skórování, chyby k procvičení, statistiky, čeština) + testy
- `src/stars/` – rozložení a vykreslování hvězd (Canvas 2D / WebGL2)
- `src/task/` – přehrávač příkladu (zadání, klávesnice, nápověda)
- `src/screens/` – obrazovky (Domů, Úrovně, Cvičení, Chyby, Závod, Trénink, Nebe, Kalkulačka, Rodiče)
- `src/state/` – uložený stav (`g92:matematika:*` v localStorage), předčítání

Nasazení: GitHub Actions (`.github/workflows/deploy.yml`) – build a `actions/deploy-pages`
(v nastavení repozitáře musí být Pages → Source: GitHub Actions).
