// Busca o calendário de contribuições de várias contas do GitHub e grava
// um único JSON somado por dia em public/contributions.json.
//
// Tokens (variáveis de ambiente), um por conta. Se faltar o da conta, usa
// GH_TOKEN como fallback (só enxerga contribuições públicas).
//   GH_TOKEN_JVSOUZX, GH_TOKEN_INOVAMOBIL, GH_TOKEN
import { mkdirSync, writeFileSync } from 'node:fs';

const ACCOUNTS = [
  { login: 'jvsouzx', tokenEnv: 'GH_TOKEN_JVSOUZX' },
  { login: 'jvitor-inovamobil', tokenEnv: 'GH_TOKEN_INOVAMOBIL' },
];

const QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const to = new Date();
const from = new Date(to);
from.setFullYear(from.getFullYear() - 1);

const merged = new Map();
const accounts = [];

for (const { login, tokenEnv } of ACCOUNTS) {
  const token = process.env[tokenEnv] || process.env.GH_TOKEN;
  if (!token) {
    console.warn(`[skip] ${login}: no token (${tokenEnv} or GH_TOKEN)`);
    continue;
  }

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: { login, from: from.toISOString(), to: to.toISOString() },
    }),
  });
  const json = await res.json();
  const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    console.warn(`[skip] ${login}:`, JSON.stringify(json.errors ?? json));
    continue;
  }

  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      merged.set(day.date, (merged.get(day.date) ?? 0) + day.contributionCount);
    }
  }
  accounts.push({ login, total: calendar.totalContributions });
  console.log(`[ok] ${login}: ${calendar.totalContributions} contributions`);
}

if (accounts.length === 0) {
  console.error('No account could be fetched; keeping the existing file.');
  process.exit(1);
}

const days = [...merged.entries()].sort(([a], [b]) => a.localeCompare(b));
const total = days.reduce((sum, [, count]) => sum + count, 0);

mkdirSync('public', { recursive: true });
writeFileSync(
  'public/contributions.json',
  JSON.stringify({ generatedAt: new Date().toISOString(), total, accounts, days }),
);
console.log(`Wrote public/contributions.json (${days.length} days, ${total} total)`);
