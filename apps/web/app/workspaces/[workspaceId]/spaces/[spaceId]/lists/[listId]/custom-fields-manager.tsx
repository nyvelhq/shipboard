'use client';

import { FormEvent, useState } from 'react';
import { CustomField, ApiError, api } from '@/lib/api';

const FIELD_TYPES = ['text', 'number', 'currency', 'dropdown', 'multiselect', 'date', 'checkbox', 'person'];

export function CustomFieldsManager({
  token,
  workspaceId,
  listId,
  fields,
  onChanged,
}: {
  token: string;
  workspaceId: string;
  listId: string;
  fields: CustomField[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [options, setOptions] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.createCustomField(token, workspaceId, {
        name: name.trim(),
        type,
        listId,
        options:
          type === 'dropdown' || type === 'multiselect'
            ? options.split(',').map((o) => o.trim()).filter(Boolean)
            : undefined,
      });
      setName('');
      setOptions('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create field.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(fieldId: string) {
    setError('');
    try {
      await api.deleteCustomField(token, workspaceId, fieldId);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete field.');
    }
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-medium text-teal-700 hover:underline"
      >
        {open ? 'Hide custom fields' : `Manage custom fields (${fields.length})`}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-gray-200 p-4">
          {fields.length > 0 && (
            <ul className="mb-3 flex flex-col gap-1.5">
              {fields.map((f) => (
                <li key={f.id} className="flex items-center justify-between text-sm">
                  <span>
                    {f.name} <span className="text-gray-400">({f.type})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    className="text-gray-300 hover:text-red-600"
                    aria-label={`Delete ${f.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

          <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded border border-gray-200 px-2 py-1.5 text-sm"
                placeholder="e.g. SKU"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded border border-gray-200 px-2 py-1.5 text-sm"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {(type === 'dropdown' || type === 'multiselect') && (
              <div>
                <label className="mb-1 block text-xs text-gray-500">Options (comma-separated)</label>
                <input
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  className="rounded border border-gray-200 px-2 py-1.5 text-sm"
                  placeholder="Small, Medium, Large"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              {saving ? 'Adding…' : 'Add field'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
