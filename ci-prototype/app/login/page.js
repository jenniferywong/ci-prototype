'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get('from') || '/';

  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, from }),
    });

    if (res.ok) {
      const { redirect } = await res.json();
      router.replace(redirect);
    } else {
      setError('Incorrect password. Try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#FAF9F6', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#fff', border: '1px solid #E5E4E2', borderRadius: 16,
        padding: '40px 36px', width: '100%', maxWidth: 380,
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
      }}>
        <img src="/icons/Brisk Logo.svg" width={36} height={36} alt="Brisk" style={{ display: 'block', marginBottom: 20 }} />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0E151C', marginBottom: 6 }}>Protected preview</h1>
        <p style={{ fontSize: 14, color: '#475467', marginBottom: 24, lineHeight: '20px' }}>
          Enter the password to access this prototype.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 8,
              border: `1px solid ${error ? '#f04438' : '#E5E4E2'}`, outline: 'none',
              fontFamily: 'inherit', color: '#0E151C', boxSizing: 'border-box',
              marginBottom: error ? 8 : 16,
            }}
          />
          {error && (
            <p style={{ fontSize: 13, color: '#f04438', marginBottom: 12 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '10px 0', background: loading || !password ? '#94a3b8' : '#06465C',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 14,
              fontWeight: 600, cursor: loading || !password ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s',
            }}
          >
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
