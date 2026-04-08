'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function GuideContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || '';
  const topic = searchParams.get('topic') || '';
  const subject = searchParams.get('subject') || '';
  const struggle = searchParams.get('struggle') || '';

  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/scaffold-guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, topic, subject, struggle }),
    })
      .then(r => r.json())
      .then(data => { if (data.error) throw new Error(data.error); setGuide(data); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [name, topic, subject, struggle]);

  const docStyle = {
    fontFamily: "'Google Sans', Arial, sans-serif",
    background: '#f8f9fa',
    minHeight: '100vh',
    padding: '40px 24px',
  };

  const pageStyle = {
    background: '#fff',
    maxWidth: 720,
    margin: '0 auto',
    padding: '60px 72px',
    boxShadow: '0 1px 8px rgba(0,0,0,0.15)',
    borderRadius: 2,
    minHeight: '80vh',
  };

  if (loading) {
    return (
      <div style={docStyle}>
        <div style={pageStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e0e0e0', borderTopColor: '#673AB7', animation: 'spin 0.75s linear infinite' }} />
            <span style={{ fontSize: 16, color: '#5f6368' }}>Generating teacher guide for <strong>{name}</strong>…</span>
          </div>
          {[80, 65, 90, 55, 70].map((w, i) => (
            <div key={i} style={{ height: 14, background: '#f0f0f0', borderRadius: 4, width: `${w}%`, marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={docStyle}>
        <div style={pageStyle}>
          <div style={{ color: '#c62828', fontSize: 14 }}>Error generating guide: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={docStyle}>
      <div style={pageStyle}>
        {/* Header bar */}
        <div style={{ borderBottom: '3px solid #673AB7', paddingBottom: 16, marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#673AB7', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Brisk Curriculum Intelligence · Teacher Guide
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 400, color: '#202124', margin: 0, lineHeight: 1.3 }}>
            {guide?.title || name}
          </h1>
          <div style={{ fontSize: 14, color: '#5f6368', marginTop: 8 }}>
            Applied to: <strong>{topic}</strong> · {subject}
          </div>
        </div>

        {/* Overview */}
        {guide?.overview && (
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#202124', marginBottom: 10, letterSpacing: '-0.01em' }}>Overview</h2>
            <p style={{ fontSize: 15, color: '#3c4043', lineHeight: 1.7, margin: 0 }}>{guide.overview}</p>
          </div>
        )}

        {/* Steps */}
        {guide?.steps?.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#202124', marginBottom: 16, letterSpacing: '-0.01em' }}>Implementation Steps</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {guide.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#673AB7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#202124', marginBottom: 4 }}>{s.step}</div>
                    <p style={{ fontSize: 14, color: '#3c4043', lineHeight: 1.65, margin: '0 0 8px' }}>{s.description}</p>
                    {s.example && (
                      <div style={{ background: '#f8f4ff', borderLeft: '3px solid #673AB7', padding: '10px 14px', borderRadius: '0 6px 6px 0', fontSize: 13, color: '#4a148c', lineHeight: 1.55 }}>
                        <span style={{ fontWeight: 700 }}>Example: </span>{s.example}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tip */}
        {guide?.tip && (
          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Classroom Tip</div>
            <p style={{ fontSize: 14, color: '#4e342e', lineHeight: 1.65, margin: 0 }}>{guide.tip}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 16, borderTop: '1px solid #e0e0e0', fontSize: 12, color: '#9e9e9e' }}>
          Generated by Brisk Curriculum Intelligence
        </div>
      </div>
    </div>
  );
}

export default function ScaffoldGuidePage() {
  return (
    <Suspense fallback={
      <div style={{ fontFamily: 'Arial, sans-serif', background: '#f8f9fa', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#5f6368' }}>Loading…</div>
      </div>
    }>
      <GuideContent />
    </Suspense>
  );
}
