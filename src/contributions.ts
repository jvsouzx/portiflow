interface ContributionData {
    generatedAt: string;
    total: number;
    accounts: { login: string; total: number }[];
    days: [string, number][];
}

const DAY_MS = 86_400_000;

// Converte a contagem do dia em um nível de 0 a 4, relativo ao melhor dia do período.
function levelFor(count: number, max: number): number {
    if (count <= 0) return 0;
    const ratio = count / max;
    if (ratio > 0.75) return 4;
    if (ratio > 0.5) return 3;
    if (ratio > 0.25) return 2;
    return 1;
}

// Datas no formato YYYY-MM-DD, tratadas em UTC para evitar deslocamento de fuso.
function parseDate(iso: string): number {
    return Date.parse(`${iso}T00:00:00Z`);
}

function formatDate(ms: number): string {
    return new Date(ms).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
}

export async function renderContributions() {
    const graph = document.getElementById('contribGraph');
    const stats = document.getElementById('contribStats');
    const updated = document.getElementById('contribUpdated');
    if (!graph || !stats || !updated) return;

    let data: ContributionData;
    try {
        const res = await fetch(`${import.meta.env.BASE_URL}contributions.json`);
        if (!res.ok) throw new Error(String(res.status));
        data = await res.json();
    } catch {
        graph.textContent = 'Contribution data is unavailable right now.';
        return;
    }

    if (data.days.length === 0) {
        graph.textContent = 'Contribution data will appear after the first sync.';
        return;
    }

    const counts = new Map(data.days);
    const max = Math.max(...data.days.map(([, n]) => n), 1);

    // Colunas são semanas (domingo a sábado), como no GitHub.
    const first = parseDate(data.days[0][0]);
    const last = parseDate(data.days[data.days.length - 1][0]);
    const start = first - new Date(first).getUTCDay() * DAY_MS;

    const frag = document.createDocumentFragment();
    for (let t = start; t <= last; t += DAY_MS) {
        const iso = new Date(t).toISOString().slice(0, 10);
        const cell = document.createElement('i');
        if (t < first) {
            cell.className = 'empty';
        } else {
            const n = counts.get(iso) ?? 0;
            cell.className = `lv${levelFor(n, max)}`;
            cell.title = `${n} contribution${n === 1 ? '' : 's'} on ${formatDate(t)}`;
        }
        frag.appendChild(cell);
    }
    graph.replaceChildren(frag);

    const parts = [`<div><strong>${data.total.toLocaleString('en-US')}</strong><span>contributions in the last year</span></div>`];
    for (const acc of data.accounts) {
        parts.push(`<div><strong>${acc.total.toLocaleString('en-US')}</strong><span>@${acc.login}</span></div>`);
    }
    stats.innerHTML = parts.join('');

    updated.textContent = `Last synced ${formatDate(Date.parse(data.generatedAt))}`;
}
