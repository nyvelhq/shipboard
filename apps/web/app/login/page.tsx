'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { buttonStyle, errorStyle, inputStyle, mutedStyle } from '../../lib/ui';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth();
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result =
        mode === 'login' ? await api.login({ email, password }) : await api.signup({ email, name, password });
      setSession(result.token, result.user);
      router.push('/workspaces');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 380, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ marginBottom: '.25rem' }}>Shipboard</h1>
      <p style={{ ...mutedStyle, marginTop: 0, marginBottom: '1.5rem' }}>
        {mode === 'login' ? 'Sign in to your account.' : 'Create an account.'}
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {mode === 'signup' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          </label>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
          />
        </label>
        {error && <p style={{ ...errorStyle, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login');
          setError('');
        }}
        style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#2a655d', cursor: 'pointer', padding: 0 }}
      >
        {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
      </button>
    </main>
  );
}
