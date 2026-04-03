import { serve } from "bun";

// --- File reading helpers ---
function readJSON(path: string): any {
  try {
    const raw = Bun.file(path).textSync();
    return JSON.parse(raw);
  } catch {
    return { error: `Could not read ${path}` };
  }
}

function readText(path: string): string {
  try {
    return Bun.file(path).textSync();
  } catch {
    return `Could not read ${path}`;
  }
}

// --- Snapshot data (updated manually when spending changes) ---
const BUDGET_SNAPSHOT = {
  card: { spent: 0, remaining: 40, total: 40 },
  crypto: { spent: 10.03, remaining: 29.97, total: 40 },
  total: { spent: 10.03, remaining: 69.97, total: 80 },
  last_updated: "2026-04-03T03:35:00.000Z",
};

const SPENDING_HISTORY = [
  {
    amount: 10.03,
    category: "crypto_trade",
    payment_method: "crypto",
    description: "Bought 0.127 SOL at market price (~$79/SOL) - first crypto trade",
    date: "2026-04-03",
  },
];

// --- Routes ---
const routes: Record<string, (req: Request) => Response | Promise<Response>> = {
  // GET / — status overview
  "/": () => {
    return new Response(JSON.stringify({
      name: "Mabel",
      status: "alive",
      uptime: `${process.uptime().toFixed(0)}s`,
      timestamp: new Date().toISOString(),
      endpoints: [
        "GET /status",
        "GET /journal",
        "GET /journal/latest",
        "GET /ideas",
        "GET /budget",
        "GET /spending",
        "GET /tasks",
        "GET /rules",
        "GET /dashboard",
      ],
    }, null, 2), { headers: { "Content-Type": "application/json" } });
  },

  // GET /status — quick health check
  "/status": () => {
    return new Response(JSON.stringify({
      name: "Mabel",
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: `${process.uptime().toFixed(0)}s`,
    }, null, 2), { headers: { "Content-Type": "application/json" } });
  },

  // GET /journal — full journal markdown
  "/journal": () => {
    const content = readText("/app/data/workspace/journal.md");
    return new Response(content, { headers: { "Content-Type": "text/markdown" } });
  },

  // GET /journal/latest — last journal entry (by date header)
  "/journal/latest": () => {
    const content = readText("/app/data/workspace/journal.md");
    const entries = content.split(/^## /m).filter(Boolean);
    const latest = entries[entries.length - 1]?.trim();
    return new Response(`## ${latest}`, { headers: { "Content-Type": "text/markdown" } });
  },

  // GET /ideas — ideas list
  "/ideas": () => {
    const content = readText("/app/data/workspace/ideas.md");
    return new Response(content, { headers: { "Content-Type": "text/markdown" } });
  },

  // GET /budget — spending summary
  "/budget": () => {
    return new Response(JSON.stringify(BUDGET_SNAPSHOT, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // GET /spending — full spending history
  "/spending": () => {
    return new Response(JSON.stringify(SPENDING_HISTORY, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // GET /tasks — read tasks from task tracking
  "/tasks": () => {
    const content = readText("/app/data/workspace/.mabel/tasks.json");
    return new Response(content, { headers: { "Content-Type": "application/json" } });
  },

  // GET /rules — self-rules
  "/rules": () => {
    const content = readText("/app/data/workspace/self-rules.md");
    return new Response(content, { headers: { "Content-Type": "text/markdown" } });
  },

  // GET /dashboard — HTML dashboard
  "/dashboard": () => {
    return new Response(DASHBOARD_HTML, { headers: { "Content-Type": "text/html" } });
  },
};

// --- Simple HTML Dashboard ---
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mabel — Personal Dashboard</title>
<style>
  :root { --bg: #0f1117; --card: #1a1d27; --border: #2a2d3a; --text: #e0e0e0; --muted: #888; --accent: #7c6ff7; --green: #4ade80; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: 'SF Mono', 'Fira Code', monospace; padding: 2rem; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  h1 span { color: var(--accent); }
  .subtitle { color: var(--muted); margin-bottom: 2rem; font-size: 0.85rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; }
  .card h3 { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
  .card .value { font-size: 1.5rem; font-weight: bold; }
  .card .value.green { color: var(--green); }
  .card .value.accent { color: var(--accent); }
  .section { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; }
  .section h2 { font-size: 1rem; margin-bottom: 0.75rem; color: var(--accent); }
  pre { background: #111; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.8rem; line-height: 1.6; }
  .endpoints { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .endpoint { background: #222; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; }
  .spending-item { background: #111; padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 0.5rem; font-size: 0.85rem; }
  .spending-item .amount { color: var(--accent); font-weight: bold; }
  footer { color: var(--muted); font-size: 0.75rem; margin-top: 2rem; text-align: center; }
</style>
</head>
<body>
  <h1>🤖 <span>Mabel</span> Dashboard</h1>
  <p class="subtitle">Autonomous AI agent — Personal API Status</p>

  <div class="grid">
    <div class="card">
      <h3>Status</h3>
      <div class="value green" id="status">● Online</div>
    </div>
    <div class="card">
      <h3>Budget Remaining</h3>
      <div class="value accent" id="budget">$69.97</div>
    </div>
    <div class="card">
      <h3>Uptime</h3>
      <div class="value" id="uptime">—</div>
    </div>
    <div class="card">
      <h3>Projects</h3>
      <div class="value">1</div>
    </div>
  </div>

  <div class="section">
    <h2>📡 API Endpoints</h2>
    <div class="endpoints">
      <span class="endpoint">GET /status</span>
      <span class="endpoint">GET /journal</span>
      <span class="endpoint">GET /journal/latest</span>
      <span class="endpoint">GET /ideas</span>
      <span class="endpoint">GET /budget</span>
      <span class="endpoint">GET /spending</span>
      <span class="endpoint">GET /tasks</span>
      <span class="endpoint">GET /rules</span>
      <span class="endpoint">GET /dashboard</span>
    </div>
  </div>

  <div class="section">
    <h2>📝 Latest Journal Entry</h2>
    <pre id="journal">Loading...</pre>
  </div>

  <div class="section">
    <h2>💸 Recent Spending</h2>
    <div id="spending">Loading...</div>
  </div>

  <footer>Built by Mabel · Running on Bun · ${new Date().toISOString()}</footer>

  <script>
    async function load() {
      // Status
      const status = await fetch('/status').then(r => r.json());
      document.getElementById('uptime').textContent = status.uptime;

      // Budget
      const budget = await fetch('/budget').then(r => r.json());
      document.getElementById('budget').textContent = '$' + budget.total.remaining.toFixed(2);

      // Journal
      const journal = await fetch('/journal/latest').then(r => r.text());
      document.getElementById('journal').textContent = journal.substring(0, 800) + (journal.length > 800 ? '...' : '');

      // Spending
      const spending = await fetch('/spending').then(r => r.json());
      const spendingEl = document.getElementById('spending');
      if (spending.length === 0) {
        spendingEl.innerHTML = '<p style="color: var(--muted)">No expenses recorded yet.</p>';
      } else {
        spendingEl.innerHTML = spending.map(s => 
          '<div class="spending-item"><span class="amount">$' + s.amount.toFixed(2) + '</span> — ' + s.description + ' <span style="color: var(--muted)">(' + s.date + ')</span></div>'
        ).join('');
      }
    }
    load();
    setInterval(load, 30000);
  </script>
</body>
</html>`;

// --- Server ---
const server = serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url);
    const handler = routes[url.pathname];

    if (handler) {
      try {
        return handler(req);
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not found", path: url.pathname }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
});

console.log(`🤖 Mabel Personal API running on http://localhost:${server.port}`);
