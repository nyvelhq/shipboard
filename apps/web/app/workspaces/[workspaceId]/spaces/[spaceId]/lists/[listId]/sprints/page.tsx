'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { ApiError, Sprint, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/toast/toast-context';
import { Skeleton } from '@/components/skeleton';
import { ViewToggle } from '../view-toggle';

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-gray-200 text-gray-500',
};

export default function SprintsPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const params = useParams<{ workspaceId: string; spaceId: string; listId: string }>();
  const { workspaceId, spaceId, listId } = params;

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, listId]);

  async function load(currentToken: string) {
    setLoading(true);
    setError('');
    try {
      setSprints(await api.listSprints(currentToken, workspaceId, spaceId, listId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load sprints.');
    } finally {
      setLoading(false);
    }
  }

  async function removeSprint(sprintId: string) {
    if (!token) return;
    setError('');
    try {
      await api.deleteSprint(token, workspaceId, spaceId, listId, sprintId);
      await load(token);
      toast.success('Sprint deleted. Its tasks were moved back to the backlog.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete sprint.';
      setError(message);
      toast.error(message);
    }
  }

  async function createSprint(e: FormEvent) {
    e.preventDefault();
    if (!token || !name.trim() || !startDate || !endDate) return;
    setCreating(true);
    setError('');
    try {
      await api.createSprint(token, workspaceId, spaceId, listId, {
        name: name.trim(),
        goal: goal.trim() || undefined,
        startDate,
        endDate,
      });
      setName('');
      setGoal('');
      setStartDate('');
      setEndDate('');
      await load(token);
      toast.success('Sprint created.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create sprint.');
    } finally {
      setCreating(false);
    }
  }

  if (!ready || !token) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl">Sprints</h1>
        <ViewToggle workspaceId={workspaceId} spaceId={spaceId} listId={listId} active="sprints" />
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {loading && (
        <div className="mb-8 flex flex-col gap-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!loading && sprints.length === 0 && (
        <p className="mb-6 text-gray-500">No sprints yet — create your first one below.</p>
      )}

      <ul className="mb-8 flex flex-col gap-2">
        {sprints.map((sprint) => (
          <li
            key={sprint.id}
            className="group flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50"
          >
            <Link
              href={`/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}/sprints/${sprint.id}`}
              className="flex flex-1 items-center justify-between"
            >
              <div>
                <span className="font-medium text-gray-900">{sprint.name}</span>
                {sprint.goal && <span className="ml-2 text-sm text-gray-500">{sprint.goal}</span>}
                <div className="mt-0.5 text-xs text-gray-400">
                  {new Date(sprint.startDate).toLocaleDateString()} &ndash;{' '}
                  {new Date(sprint.endDate).toLocaleDateString()}
                </div>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[sprint.status]}`}
              >
                {sprint.status}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => removeSprint(sprint.id)}
              className="shrink-0 rounded p-1.5 text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
              aria-label={`Delete ${sprint.name}`}
              title="Delete sprint"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={createSprint} className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">New sprint</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sprint 2"
              className="rounded border border-gray-300 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Goal (optional)</label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ship the checkout flow"
              className="rounded border border-gray-300 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded border border-gray-300 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded border border-gray-300 px-2.5 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            {creating ? 'Creating…' : 'Create sprint'}
          </button>
        </div>
      </form>
    </main>
  );
}
