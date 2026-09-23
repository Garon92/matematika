/** Stars for a finished session based on answers correct on the first try. */
export function starsFor(firstTry: number, total: number): 0 | 1 | 2 | 3 {
  if (total <= 0) return 0;
  const r = firstTry / total;
  if (r >= 0.9) return 3;
  if (r >= 0.7) return 2;
  if (r >= 0.5) return 1;
  return 0;
}

/** Timed challenge stars from thresholds [1★, 2★, 3★]. */
export function timedStars(score: number, thresholds: readonly [number, number, number]): 0 | 1 | 2 | 3 {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

/** Friendly Czech headline for a result. */
export function praise(stars: number): string {
  switch (stars) {
    case 3:
      return 'Úžasné! Jsi hvězda!';
    case 2:
      return 'Moc pěkné!';
    case 1:
      return 'Dobrá práce!';
    default:
      return 'Nevadí, příště to půjde líp!';
  }
}
