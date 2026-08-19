'use client';

import { FormEvent, useState } from 'react';
import { Tag, ApiError, api } from '@/lib/api';
import { useToast } from '@/components/toast/toast-context';

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#6b7280',
];

export function TagsManager({
  token,
  workspaceId,
  tags,
  onChanged,
}: {
  token: string;
  workspaceId: string;
  tags: Tag[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.createTag(token, workspaceId, name.trim(), color);
      setName('');
      onChanged();
      toast.success('Tag created.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create tag.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(tagId: string) {
    setError('');
    try {
      await api.deleteTag(token, workspaceId, tagId);
      onChanged();
      toast.success('Tag deleted.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete tag.';
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-medium text-teal-700 hover:underline"
      >
        {open ? 'Hide tags' : `Manage tags (${tags.length})`}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-gray-200 p-4">
          {tags.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1.5 text-xs font-medium"
                  style={{ backgroundColor: `${t.color}1a`, color: t.color }}
                >
                  {t.name}
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    className="rounded-full p-0.5 hover:bg-black/10"
                    aria-label={`Delete ${t.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

          <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded border border-gray-200 px-2 py-1.5 text-sm"
                placeholder="e.g. bug"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Color</label>
              <div className="flex items-center gap-1 py-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-5 w-5 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Choose color ${c}`}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              {saving ? 'Adding…' : 'Add tag'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
