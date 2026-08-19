const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Home() {
  return (
    <main style={{ padding: '3rem', maxWidth: 640 }}>
      <h1>Shipboard</h1>
      <p>
        Frontend scaffold only — Next.js 14 App Router. No product UI has been
        built yet; that starts at Week 3-4 of the plan.
      </p>
      <p>
        Expected API health check: <code>{API_URL}/health</code>
      </p>
      <p>
        See <code>HANDOFF.md</code> at the repo root and the published PRD for
        what to build next.
      </p>
    </main>
  );
}
