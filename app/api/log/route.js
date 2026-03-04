const SHEETS_URL =
  'https://script.google.com/macros/s/AKfycbxpoqML6yUaVbdCln3YtnDMJKI9EpeqobsZaJG-QqS1yfR6KT3uBywOBjqv7pU_q5Jq/exec';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[log] forwarding step:', body.step, '| session:', body.sessionId);

    const res = await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
    });

    console.log('[log] sheets status:', res.status);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[log] error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
