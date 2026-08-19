'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  Attachment,
  Comment,
  CustomField,
  Member,
  Task,
  TaskInput,
  api,
  ApiError,
  API_URL,
} from '@/lib/api';

interface Props {
  token: string;
  workspaceId: string;
  spaceId: string;
  listId: string;
  task: Task;
  customFields: CustomField[];
  members: Member[];
  onClose: () => void;
  onPatch: (taskId: string, input: TaskInput) => Promise<void>;
}

export function TaskDetailPanel({
  token,
  workspaceId,
  spaceId,
  listId,
  task,
  customFields,
  members,
  onClose,
  onPatch,
}: Props) {
  const [description, setDescription] = useState(task.description ?? '');
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDescription(task.description ?? '');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  async function load() {
    setError('');
    try {
      const [commentData, attachmentData] = await Promise.all([
        api.listComments(token, workspaceId, spaceId, listId, task.id),
        api.listAttachments(token, workspaceId, spaceId, listId, task.id),
      ]);
      setComments(commentData);
      setAttachments(attachmentData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load task details.');
    }
  }

  function currentValue(fieldId: string): unknown {
    return task.customFieldValues.find((v) => v.customFieldId === fieldId)?.value;
  }

  async function saveDescription() {
    if (description === (task.description ?? '')) return;
    await onPatch(task.id, { description });
  }

  async function saveCustomField(fieldId: string, value: unknown) {
    await onPatch(task.id, { customFieldValues: { [fieldId]: value } });
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    setError('');
    try {
      await api.createComment(token, workspaceId, spaceId, listId, task.id, newComment.trim());
      setNewComment('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  }

  async function removeComment(commentId: string) {
    setError('');
    try {
      await api.deleteComment(token, workspaceId, spaceId, listId, task.id, commentId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete comment.');
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await api.uploadAttachment(token, workspaceId, spaceId, listId, task.id, file);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function removeAttachment(attachmentId: string) {
    setError('');
    try {
      await api.deleteAttachment(token, workspaceId, spaceId, listId, task.id, attachmentId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete attachment.');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="pr-4 text-lg font-semibold text-gray-900">{task.name}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
            ✕
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <section className="mb-6">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={3}
            placeholder="Add a description…"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </section>

        {customFields.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Custom fields</h3>
            <div className="flex flex-col gap-3">
              {customFields.map((field) => (
                <CustomFieldInput
                  key={field.id}
                  field={field}
                  members={members}
                  value={currentValue(field.id)}
                  onChange={(value) => saveCustomField(field.id, value)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Attachments {attachments.length > 0 && `(${attachments.length})`}
          </h3>
          <div className="flex flex-col gap-2">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                <a
                  href={`${API_URL}${att.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-teal-700 hover:underline"
                >
                  {att.filename}
                </a>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="ml-2 shrink-0 text-gray-300 hover:text-red-600"
                  aria-label="Remove attachment"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <label className="mt-2 inline-block cursor-pointer text-sm font-medium text-teal-700 hover:underline">
            {uploading ? 'Uploading…' : '+ Add attachment'}
            <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
          </label>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h3>
          <div className="flex flex-col gap-3">
            {comments.map((c) => (
              <div key={c.id} className="rounded border border-gray-100 bg-gray-50 p-2.5 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-gray-700">{c.user.name}</span>
                  <button
                    type="button"
                    onClick={() => removeComment(c.id)}
                    className="text-xs text-gray-300 hover:text-red-600"
                  >
                    delete
                  </button>
                </div>
                <p className="text-gray-800">{c.body}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-gray-400">No comments yet.</p>}
          </div>

          <form onSubmit={submitComment} className="mt-3 flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="submit"
              disabled={postingComment}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Post
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function CustomFieldInput({
  field,
  members,
  value,
  onChange,
}: {
  field: CustomField;
  members: Member[];
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [local, setLocal] = useState(value ?? '');

  useEffect(() => setLocal(value ?? ''), [value]);

  const inputClass =
    'w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600';

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{field.name}</label>
      {field.type === 'checkbox' ? (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4"
        />
      ) : field.type === 'dropdown' && field.options ? (
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === 'person' ? (
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user.name}
            </option>
          ))}
        </select>
      ) : field.type === 'date' ? (
        <input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          type={field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
          value={local as string}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => local !== value && onChange(local)}
          className={inputClass}
        />
      )}
    </div>
  );
}
