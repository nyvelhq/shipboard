'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, ListItem, Space } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { buttonStyle, errorStyle, inputStyle, mutedStyle } from '../../../lib/ui';

interface SpaceWithLists extends Space {
  lists: ListItem[];
}

export default function WorkspaceDetailPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  const [workspaceName, setWorkspaceName] = useState('');
  const [spaces, setSpaces] = useState<SpaceWithLists[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [creatingSpace, setCreatingSpace] = useState(false);
  const [newListNameBySpace, setNewListNameBySpace] = useState<Record<string, string>>({});
  const [creatingListFor, setCreatingListFor] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, workspaceId]);

  async function load(currentToken: string) {
    setLoading(true);
    setError('');
    try {
      const [workspace, spaceList] = await Promise.all([
        api.getWorkspace(currentToken, workspaceId),
        api.listSpaces(currentToken, workspaceId),
      ]);
      setWorkspaceName(workspace.name);
      const withLists = await Promise.all(
        spaceList.map(async (space) => ({
          ...space,
          lists: await api.listLists(currentToken, workspaceId, space.id),
        })),
      );
      setSpaces(withLists);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load workspace.');
    } finally {
      setLoading(false);
    }
  }

  async function createSpace(e: FormEvent) {
    e.preventDefault();
    if (!token || !newSpaceName.trim()) return;
    setCreatingSpace(true);
    setError('');
    try {
      await api.createSpace(token, workspaceId, newSpaceName.trim());
      setNewSpaceName('');
      await load(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create Space.');
    } finally {
      setCreatingSpace(false);
    }
  }

  async function createList(spaceId: string) {
    const name = (newListNameBySpace[spaceId] || '').trim();
    if (!token || !name) return;
    setCreatingListFor(spaceId);
    setError('');
    try {
      await api.createList(token, workspaceId, spaceId, name);
      setNewListNameBySpace((prev) => ({ ...prev, [spaceId]: '' }));
      await load(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create List.');
    } finally {
      setCreatingListFor(null);
    }
  }

  if (!ready || !token) return null;

  return (
    <main style={{ maxWidth: 720, margin: '3rem auto', padding: '0 1.5rem' }}>
      <p>
        <Link href="/workspaces" style={{ color: '#2a655d' }}>
          &larr; All workspaces
        </Link>
      </p>
      <h1 style={{ marginBottom: '1.5rem' }}>{loading ? 'Loading…' : workspaceName}</h1>

      {error && <p style={errorStyle}>{error}</p>}
      {!loading && spaces.length === 0 && <p style={mutedStyle}>No Spaces yet — create your first one below.</p>}

      {spaces.map((space) => (
        <section key={space.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', margin: '0 0 .75rem' }}>{space.name}</h2>

          {space.lists.length === 0 ? (
            <p style={{ ...mutedStyle, fontSize: '.9rem' }}>No Lists yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 .75rem' }}>
              {space.lists.map((list) => (
                <li key={list.id} style={{ padding: '.4rem 0', borderTop: '1px solid #f2f2f2' }}>
                  {list.name}
                  <span style={{ ...mutedStyle, fontSize: '.8rem', marginLeft: '.5rem' }}>{list.type}</span>
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input
              value={newListNameBySpace[space.id] || ''}
              onChange={(e) => setNewListNameBySpace((prev) => ({ ...prev, [space.id]: e.target.value }))}
              placeholder="New list name"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={() => createList(space.id)}
              disabled={creatingListFor === space.id}
              style={{ ...buttonStyle, padding: '.5rem .8rem', fontSize: '.85rem' }}
            >
              {creatingListFor === space.id ? 'Adding…' : 'Add list'}
            </button>
          </div>
        </section>
      ))}

      <form onSubmit={createSpace} style={{ display: 'flex', gap: '.5rem', marginTop: '1.5rem' }}>
        <input
          value={newSpaceName}
          onChange={(e) => setNewSpaceName(e.target.value)}
          placeholder="New Space name"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="submit" disabled={creatingSpace} style={buttonStyle}>
          {creatingSpace ? 'Creating…' : 'Create Space'}
        </button>
      </form>
    </main>
  );
}
