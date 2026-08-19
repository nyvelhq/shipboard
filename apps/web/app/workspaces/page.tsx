'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, Workspace } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

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
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="m-0">Shipboard</h1>
          <p className="mt-1 text-gray-500">{user?.name}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>

      <h2 className="text-lg">Your workspaces</h2>
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && workspaces.length === 0 && (
        <p className="text-gray-500">No workspaces yet — create your first one below.</p>
      )}

      <ul className="my-4 list-none p-0">
        {workspaces.map((ws) => (
          <li key={ws.id} className="border-b border-gray-100 py-3">
            <Link href={`/workspaces/${ws.id}`} className="font-semibold text-gray-900 no-underline hover:text-teal-700">
              {ws.name}
            </Link>
            <span className="ml-2 text-sm text-gray-500">{ws.plan}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={createWorkspace} className="mt-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New workspace name"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
      </form>
    </main>
  );
}
