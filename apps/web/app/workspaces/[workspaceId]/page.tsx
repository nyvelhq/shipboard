'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, ListItem, Space } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

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
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-2xl">{loading ? 'Loading…' : workspaceName}</h1>

      {error && <p className="text-red-600">{error}</p>}
      {!loading && spaces.length === 0 && (
        <p className="text-gray-500">No Spaces yet — create your first one below.</p>
      )}

      {spaces.map((space) => (
        <section key={space.id} className="mb-4 rounded-lg border border-gray-200 p-4">
          <h2 className="mb-3 text-base">{space.name}</h2>

          {space.lists.length === 0 ? (
            <p className="mb-3 text-sm text-gray-500">No Lists yet.</p>
          ) : (
            <ul className="mb-3 list-none p-0">
              {space.lists.map((list) => (
                <li key={list.id} className="border-t border-gray-100 py-1.5">
                  <Link
                    href={`/workspaces/${workspaceId}/spaces/${space.id}/lists/${list.id}`}
                    className="font-semibold text-gray-900 no-underline hover:text-teal-700"
                  >
                    {list.name}
                  </Link>
                  <span className="ml-2 text-sm text-gray-500">{list.type}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              value={newListNameBySpace[space.id] || ''}
              onChange={(e) => setNewListNameBySpace((prev) => ({ ...prev, [space.id]: e.target.value }))}
              placeholder="New list name"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="button"
              onClick={() => createList(space.id)}
              disabled={creatingListFor === space.id}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              {creatingListFor === space.id ? 'Adding…' : 'Add list'}
            </button>
          </div>
        </section>
      ))}

      <form onSubmit={createSpace} className="mt-6 flex gap-2">
        <input
          value={newSpaceName}
          onChange={(e) => setNewSpaceName(e.target.value)}
          placeholder="New Space name"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
        <button
          type="submit"
          disabled={creatingSpace}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          {creatingSpace ? 'Creating…' : 'Create Space'}
        </button>
      </form>
    </main>
  );
}
