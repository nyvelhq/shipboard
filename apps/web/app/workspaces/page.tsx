'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, Workspace } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { buttonStyle, errorStyle, ghostButtonStyle, inputStyle, mutedStyle } from '../../lib/ui';

export default function WorkspacesPage() {
  const { token, user, ready, logout } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token]);

  async function load(currentToken: string) {
    setLoading(true);
    try {
      setWorkspaces(await api.listWorkspaces(currentToken));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load workspaces.');
    } finally {
      setLoading(false);
    }
  }

  async function createWorkspace(e: FormEvent) {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.createWorkspace(token, newName.trim());
      setNewName('');
      await load(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create workspace.');
    } finally {
      setCreating(false);
    }
  }

  if (!ready || !token) return null;

  return (
    <main style={{ maxWidth: 640, margin: '3rem auto', padding: '0 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Shipboard</h1>
          <p style={{ margin: '.25rem 0 0', ...mutedStyle }}>{user?.name}</p>
        </div>
        <button
          onClick={() => {
            logout();
            router.push('/login');
          }}
          style={ghostButtonStyle}
        >
          Sign out
        </button>
      </div>

      <h2 style={{ fontSize: '1.1rem' }}>Your workspaces</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={errorStyle}>{error}</p>}
      {!loading && workspaces.length === 0 && (
        <p style={mutedStyle}>No workspaces yet — create your first one below.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0' }}>
        {workspaces.map((ws) => (
          <li key={ws.id} style={{ borderBottom: '1px solid #eee', padding: '.75rem 0' }}>
            <Link href={`/workspaces/${ws.id}`} style={{ color: '#12151a', fontWeight: 600, textDecoration: 'none' }}>
              {ws.name}
            </Link>
            <span style={{ ...mutedStyle, marginLeft: '.5rem', fontSize: '.85rem' }}>{ws.plan}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={createWorkspace} style={{ display: 'flex', gap: '.5rem', marginTop: '1.5rem' }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New workspace name"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="submit" disabled={creating} style={buttonStyle}>
          {creating ? 'Creating…' : 'Create'}
        </button>
      </form>
    </main>
  );
}
