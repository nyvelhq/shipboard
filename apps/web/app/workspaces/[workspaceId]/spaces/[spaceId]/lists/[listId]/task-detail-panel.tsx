'use client';

import { ChangeEvent, ClipboardEvent, FormEvent, useEffect, useState } from 'react';
import { Link2, Paperclip, X } from 'lucide-react';
import {
  AcceptanceCriterion,
  Attachment,
  Comment,
  CustomField,
  Member,
  Status,
  Tag,
  Task,
  TaskDependencies,
  TaskInput,
  api,
  ApiError,
  API_URL,
} from '@/lib/api';
import { useToast } from '@/components/toast/toast-context';

const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

// Matches the backend sentinel (attachments.service.ts LINK_MIME_TYPE) —
// a link attachment has no uploaded file. Used here only to pick the
// Link2 vs. Paperclip icon; the href itself is resolved by URL shape
// below, since an uploaded file's url is relative for local disk storage
// but already-absolute for S3 (a presigned URL), same as a link's.
const LINK_MIME_TYPE = 'text/uri-list';

interface Props {
  token: string;
  workspaceId: string;
  spaceId: string;
  listId: string;
  task: Task;
  statuses: Status[];
  customFields: CustomField[];
  members: Member[];
  allTags: Tag[];
  allTasks: Task[];
  onClose: () => void;
  onPatch: (taskId: string, input: TaskInput) => Promise<void>;
}

export function TaskDetailPanel({
  token,
  workspaceId,
  spaceId,
  listId,
  task,
  statuses,
  customFields,
  members,
  allTags,
  allTasks,
  onClose,
  onPatch,
}: Props) {
  const toast = useToast();
  const [title, setTitle] = useState(task.name);
  const [description, setDescription] = useState(task.description ?? '');
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependencies>({ blockedBy: [], blocking: [] });
  const [blockerTaskId, setBlockerTaskId] = useState('');
  const [addingBlocker, setAddingBlocker] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [submittingLink, setSubmittingLink] = useState(false);
  const [newCriterion, setNewCriterion] = useState('');
  const [addingCriterion, setAddingCriterion] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  async function load() {
    setError('');
    try {
      const [commentData, attachmentData, criteriaData, dependencyData] = await Promise.all([
        api.listComments(token, workspaceId, spaceId, listId, task.id),
        api.listAttachments(token, workspaceId, spaceId, listId, task.id),
        api.listAcceptanceCriteria(token, workspaceId, spaceId, listId, task.id),
        api.listDependencies(token, workspaceId, spaceId, listId, task.id),
      ]);
      setComments(commentData);
      setAttachments(attachmentData);
      setCriteria(criteriaData);
      setDependencies(dependencyData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load task details.');
    }
  }

  function currentValue(fieldId: string): unknown {
    return task.customFieldValues.find((v) => v.customFieldId === fieldId)?.value;
  }

  async function saveTitle() {
    if (!title.trim()) {
      setTitle(task.name);
      return;
    }
    if (title.trim() === task.name) return;
    await onPatch(task.id, { name: title.trim() });
  }

  async function saveDescription() {
    if (description === (task.description ?? '')) return;
    await onPatch(task.id, { description });
  }

  async function saveCustomField(fieldId: string, value: unknown) {
    await onPatch(task.id, { customFieldValues: { [fieldId]: value } });
  }

  async function toggleTag(tagId: string, shouldHaveTag: boolean) {
    const currentIds = task.tags.map((t) => t.tagId);
    const nextIds = shouldHaveTag ? [...currentIds, tagId] : currentIds.filter((id) => id !== tagId);
    await onPatch(task.id, { tagIds: nextIds });
  }

  async function toggleAssignee(userId: string, shouldBeAssigned: boolean) {
    const currentIds = task.assignees.map((a) => a.userId);
    const nextIds = shouldBeAssigned ? [...currentIds, userId] : currentIds.filter((id) => id !== userId);
    await onPatch(task.id, { assigneeIds: nextIds });
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

  async function uploadFile(file: File) {
    setUploading(true);
    setError('');
    try {
      await api.uploadAttachment(token, workspaceId, spaceId, listId, task.id, file);
      await load();
      toast.success('Attachment uploaded.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Upload failed.';
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = '';
  }

  async function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (!item) return;
    const blob = item.getAsFile();
    if (!blob) return;
    e.preventDefault();
    const extension = item.type.split('/')[1] || 'png';
    const file = new File([blob], `pasted-image-${Date.now()}.${extension}`, { type: item.type });
    await uploadFile(file);
  }

  async function submitLink(e: FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    setSubmittingLink(true);
    setError('');
    try {
      await api.createLinkAttachment(token, workspaceId, spaceId, listId, task.id, linkUrl.trim(), linkLabel.trim());
      setLinkUrl('');
      setLinkLabel('');
      setAddingLink(false);
      await load();
      toast.success('Link attached.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to attach link.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmittingLink(false);
    }
  }

  async function removeAttachment(attachmentId: string) {
    setError('');
    try {
      await api.deleteAttachment(token, workspaceId, spaceId, listId, task.id, attachmentId);
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete attachment.';
      setError(message);
      toast.error(message);
    }
  }

  async function submitCriterion(e: FormEvent) {
    e.preventDefault();
    if (!newCriterion.trim()) return;
    setAddingCriterion(true);
    setError('');
    try {
      await api.createAcceptanceCriterion(token, workspaceId, spaceId, listId, task.id, newCriterion.trim());
      setNewCriterion('');
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to add criterion.';
      setError(message);
      toast.error(message);
    } finally {
      setAddingCriterion(false);
    }
  }

  async function toggleCriterion(criterionId: string, completed: boolean) {
    setError('');
    try {
      await api.updateAcceptanceCriterion(token, workspaceId, spaceId, listId, task.id, criterionId, { completed });
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update criterion.';
      setError(message);
      toast.error(message);
    }
  }

  async function removeCriterion(criterionId: string) {
    setError('');
    try {
      await api.deleteAcceptanceCriterion(token, workspaceId, spaceId, listId, task.id, criterionId);
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete criterion.';
      setError(message);
      toast.error(message);
    }
  }

  async function submitBlocker(e: FormEvent) {
    e.preventDefault();
    if (!blockerTaskId) return;
    setAddingBlocker(true);
    setError('');
    try {
      await api.createDependency(token, workspaceId, spaceId, listId, task.id, blockerTaskId);
      setBlockerTaskId('');
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to add dependency.';
      setError(message);
      toast.error(message);
    } finally {
      setAddingBlocker(false);
    }
  }

  async function removeDependency(dependencyId: string) {
    setError('');
    try {
      await api.deleteDependency(token, workspaceId, spaceId, listId, task.id, dependencyId);
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to remove dependency.';
      setError(message);
      toast.error(message);
    }
  }

  const fieldLabelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500';
  const sideInputClass =
    'w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onPaste={handlePaste}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            className="-mx-1 flex-1 rounded-md border border-transparent bg-transparent px-1 text-xl font-semibold text-gray-900 outline-none focus:border-gray-200 focus:ring-2 focus:ring-teal-600"
          />
          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && <p className="shrink-0 px-6 pt-3 text-sm text-red-600">{error}</p>}

        <div className="flex flex-1 overflow-hidden">
          {/* Main content — 70% */}
          <div className="flex-[7] overflow-y-auto px-6 py-5">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: task.status.color }} />
              <select
                value={task.statusId}
                onChange={(e) => onPatch(task.id, { statusId: e.target.value })}
                className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <section className="mb-6">
              <label className={fieldLabelClass}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveDescription}
                rows={4}
                placeholder="Add a description…"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </section>

            <section className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className={fieldLabelClass}>Acceptance Criteria</h3>
                {criteria.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {criteria.filter((c) => c.completed).length}/{criteria.length}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {criteria.map((c) => (
                  <div key={c.id} className="group flex items-start gap-2 rounded px-1 py-1 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={c.completed}
                      onChange={(e) => toggleCriterion(c.id, e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <span
                      className={`flex-1 text-sm ${c.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}
                    >
                      {c.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCriterion(c.id)}
                      className="shrink-0 text-gray-300 opacity-0 hover:text-red-600 group-hover:opacity-100"
                      aria-label="Remove criterion"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {criteria.length === 0 && <p className="px-1 text-sm text-gray-400">No acceptance criteria yet.</p>}
              </div>
              <form onSubmit={submitCriterion} className="mt-2 flex gap-2">
                <input
                  value={newCriterion}
                  onChange={(e) => setNewCriterion(e.target.value)}
                  placeholder="Add a criterion…"
                  className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                <button
                  type="submit"
                  disabled={addingCriterion}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Add
                </button>
              </form>
            </section>

            <section className="mb-6">
              <h3 className={fieldLabelClass}>Dependencies</h3>

              <div className="mb-2">
                <p className="mb-1 text-xs font-medium text-gray-500">Blocked by</p>
                {dependencies.blockedBy.length === 0 && (
                  <p className="px-1 text-sm text-gray-400">Nothing is blocking this task.</p>
                )}
                <div className="flex flex-col gap-1">
                  {dependencies.blockedBy.map((dep) => (
                    <div
                      key={dep.id}
                      className="group flex items-center justify-between rounded px-1 py-1 hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-1.5 text-sm text-gray-800">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: dep.blockingTask?.status.color }}
                        />
                        {dep.blockingTask?.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDependency(dep.id)}
                        className="shrink-0 text-gray-300 opacity-0 hover:text-red-600 group-hover:opacity-100"
                        aria-label="Remove dependency"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {dependencies.blocking.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-xs font-medium text-gray-500">Blocking</p>
                  <div className="flex flex-col gap-1">
                    {dependencies.blocking.map((dep) => (
                      <div
                        key={dep.id}
                        className="group flex items-center justify-between rounded px-1 py-1 hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-1.5 text-sm text-gray-800">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: dep.blockedTask?.status.color }}
                          />
                          {dep.blockedTask?.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDependency(dep.id)}
                          className="shrink-0 text-gray-300 opacity-0 hover:text-red-600 group-hover:opacity-100"
                          aria-label="Remove dependency"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={submitBlocker} className="mt-2 flex gap-2">
                <select
                  value={blockerTaskId}
                  onChange={(e) => setBlockerTaskId(e.target.value)}
                  className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="">Add a blocker…</option>
                  {allTasks
                    .filter(
                      (t) =>
                        t.id !== task.id &&
                        !dependencies.blockedBy.some((dep) => dep.blockingTaskId === t.id),
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
                <button
                  type="submit"
                  disabled={addingBlocker || !blockerTaskId}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Add
                </button>
              </form>
            </section>

            <section className="mb-6">
              <h3 className={fieldLabelClass}>
                Attachments {attachments.length > 0 && `(${attachments.length})`}
              </h3>
              <div className="flex flex-col gap-2">
                {attachments.map((att) => {
                  const isLink = att.mimeType === LINK_MIME_TYPE;
                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm"
                    >
                      <a
                        href={att.url.startsWith('http') ? att.url : `${API_URL}${att.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 items-center gap-1.5 truncate text-teal-700 hover:underline"
                      >
                        {isLink ? (
                          <Link2 size={13} className="shrink-0" />
                        ) : (
                          <Paperclip size={13} className="shrink-0" />
                        )}
                        <span className="truncate">{att.filename}</span>
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
                  );
                })}
              </div>

              {addingLink ? (
                <form onSubmit={submitLink} className="mt-2 flex flex-col gap-1.5">
                  <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://…"
                    autoFocus
                    className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <input
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="Label (optional)"
                    className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submittingLink}
                      className="text-sm font-medium text-teal-700 hover:underline"
                    >
                      {submittingLink ? 'Adding…' : 'Add link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingLink(false);
                        setLinkUrl('');
                        setLinkLabel('');
                      }}
                      className="text-sm text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-2 flex items-center gap-4">
                  <label className="inline-block cursor-pointer text-sm font-medium text-teal-700 hover:underline">
                    {uploading ? 'Uploading…' : '+ Add attachment'}
                    <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddingLink(true)}
                    className="text-sm font-medium text-teal-700 hover:underline"
                  >
                    + Add link
                  </button>
                </div>
              )}
              <p className="mt-1.5 text-xs text-gray-400">Tip: paste a screenshot directly into this panel.</p>
            </section>

            <section>
              <h3 className={fieldLabelClass}>Comments {comments.length > 0 && `(${comments.length})`}</h3>
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

          {/* Metadata sidebar — 30% */}
          <div className="flex-[3] overflow-y-auto border-l border-gray-100 bg-gray-50/60 px-5 py-5">
            <div className="mb-4">
              <label className={fieldLabelClass}>
                Assignees {task.assignees.length > 0 && `(${task.assignees.length})`}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => {
                  const active = task.assignees.some((a) => a.userId === m.userId);
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleAssignee(m.userId, !active)}
                      className={`flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-teal-700 text-white'
                          : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${
                          active ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {m.user.name.slice(0, 1).toUpperCase()}
                      </span>
                      {m.user.name}
                    </button>
                  );
                })}
                {members.length === 0 && <p className="px-1 text-sm text-gray-400">No members yet.</p>}
              </div>
            </div>

            <div className="mb-4">
              <label className={fieldLabelClass}>Reporter</label>
              <p className="px-0.5 py-1.5 text-sm text-gray-700">{task.creator.name}</p>
            </div>

            <div className="mb-4">
              <label className={fieldLabelClass}>Priority</label>
              <select
                value={task.priority}
                onChange={(e) => onPatch(task.id, { priority: e.target.value })}
                className={`${sideInputClass} capitalize`}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className={fieldLabelClass}>Sprint</label>
              <p className="px-0.5 py-1.5 text-sm text-gray-700">{task.sprint ? task.sprint.name : 'Backlog'}</p>
            </div>

            <div className="mb-4">
              <label className={fieldLabelClass}>Story points</label>
              <input
                type="number"
                min={0}
                defaultValue={task.storyPoints ?? ''}
                placeholder="—"
                onBlur={(e) => {
                  if (e.target.value === '') return;
                  const value = Number(e.target.value);
                  if (value !== task.storyPoints) onPatch(task.id, { storyPoints: value });
                }}
                className={sideInputClass}
              />
            </div>

            <div className="mb-4 flex gap-3">
              <div className="flex-1">
                <label className={fieldLabelClass}>Start</label>
                <input
                  type="date"
                  defaultValue={task.startDate ? task.startDate.slice(0, 10) : ''}
                  onChange={(e) => e.target.value && onPatch(task.id, { startDate: e.target.value })}
                  className={sideInputClass}
                />
              </div>
              <div className="flex-1">
                <label className={fieldLabelClass}>Due</label>
                <input
                  type="date"
                  defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                  onChange={(e) => e.target.value && onPatch(task.id, { dueDate: e.target.value })}
                  className={sideInputClass}
                />
              </div>
            </div>

            {allTags.length > 0 && (
              <div className="mb-4">
                <label className={fieldLabelClass}>Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((tag) => {
                    const active = task.tags.some((t) => t.tagId === tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id, !active)}
                        className="rounded-full px-2 py-0.5 text-xs font-medium transition-opacity"
                        style={
                          active
                            ? { backgroundColor: tag.color, color: '#fff' }
                            : { backgroundColor: `${tag.color}1a`, color: tag.color, opacity: 0.55 }
                        }
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {customFields.length > 0 && (
              <div>
                <label className={fieldLabelClass}>Custom Fields</label>
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
              </div>
            )}
          </div>
        </div>
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
    'w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600';

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
