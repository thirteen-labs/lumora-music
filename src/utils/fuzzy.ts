interface FuzzyResult<T> {
  item: T;
  score: number;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t.includes(q)) return 100 - q.length;

  if (t.startsWith(q)) return 90 - q.length;

  const words = t.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(q)) return 80 - q.length;
  }

  let qi = 0;
  let consecutive = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      consecutive++;
      score += consecutive * 2;
    } else {
      consecutive = 0;
    }
  }
  if (qi === q.length) return 50 + score;

  const dist = levenshtein(q, t.slice(0, Math.max(q.length, t.length)));
  const maxLen = Math.max(q.length, t.length);
  const similarity = 1 - dist / maxLen;
  if (similarity > 0.6) return Math.floor(similarity * 40);

  return -1;
}

export function fuzzySearch<T>(
  items: T[],
  query: string,
  getFields: (item: T) => string[],
  threshold: number = 20,
): FuzzyResult<T>[] {
  if (!query.trim()) return [];
  const results: FuzzyResult<T>[] = [];
  for (const item of items) {
    const fields = getFields(item);
    let bestScore = -1;
    for (const field of fields) {
      const score = fuzzyScore(query, field);
      if (score > bestScore) bestScore = score;
    }
    if (bestScore >= threshold) {
      results.push({ item, score: bestScore });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}
