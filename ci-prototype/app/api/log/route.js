export async function POST(request) {
  const data = await request.json();
  try {
    const response = await fetch('https://api.airtable.com/v0/app6oW0VNSXnFIQBx/tblRF4h263KOiisOM', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Timestamp': data.timestamp || new Date().toISOString(),
          'User Type': data.user_type || '',
          'Session ID': data.sessionId || '',
          'Step': data.step || '',
          'User Input': data.userInput || '',
          'AI Response': data.aiResponse || '',
          'Iteration Number': String(data.iterationNumber || ''),
          'Topic': data.topic || '',
          'Subject Detected': data.subjectDetected || '',
          'Scaffold Strategy Recommended': data.scaffoldStrategy || '',
          'Custom Scaffolds Added': data.customScaffoldsAdded || '',
          'Adjustment Request': data.adjustmentRequest || ''
        }
      })
    });
    const result = await response.json();
    console.log('[airtable]', response.status, JSON.stringify(result).slice(0, 100));
    return Response.json({ ok: true });
  } catch(err) {
    console.error('[airtable error]', err.message);
    return Response.json({ ok: false });
  }
}
