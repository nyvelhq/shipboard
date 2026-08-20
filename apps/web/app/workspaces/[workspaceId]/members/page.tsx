'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { api, ApiError, Member, Workspace, WorkspaceInvite } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/toast/toast-context';
import { Skeleton } from '@/components/skeleton';

const ELEVATED_ROLES = ['owner', 'admin'];
const ASSIGNABLE_ROLES = ['admin', 'member', 'guest'];

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-teal-100 text-teal-700',
  admin: 'bg-blue-100 text-blue-700',
  member: 'bg-gray-100 text-gray-600',
  guest: 'bg-gray-100 text-gray-500',
};

export default function MembersPage() {
  const { token, user, ready } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [adding, setAdding] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

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
      const [ws, memberList] = await Promise.all([
        api.getWorkspace(currentToken, workspaceId),
        api.listMembers(currentToken, workspaceId),
      ]);
      setWorkspace(ws);
      setMembers(memberList);
      const myRole = memberList.find((m) => m.userId === user?.id)?.role;
      if (myRole && ELEVATED_ROLES.includes(myRole)) {
        setInvites(await api.listInvites(currentToken, workspaceId));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  }

  async function addMember(e: FormEvent) {
    e.preventDefault();
    if (!token || !email.trim()) return;
    setAdding(true);
    setError('');
    try {
      await api.addMember(token, workspaceId, email.trim(), role);
      setEmail('');
      setRole('member');
      await load(token);
      toast.success('Member added.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to add member.';
      setError(message);
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  async function sendInvite(e: FormEvent) {
    e.preventDefault();
    if (!token || !inviteEmail.trim()) return;
    setInviting(true);
    setError('');
    try {
      await api.createInvite(token, workspaceId, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteRole('member');
      await load(token);
      toast.success('Invite sent.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to send invite.';
      setError(message);
      toast.error(message);
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(inviteId: string, email: string) {
    if (!token) return;
    if (!window.confirm(`Revoke the invite sent to ${email}?`)) return;
    setError('');
    try {
      await api.revokeInvite(token, workspaceId, inviteId);
      await load(token);
      toast.success('Invite revoked.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to revoke invite.';
      setError(message);
      toast.error(message);
    }
  }

  async function copyInviteLink(inviteToken: string) {
    const url = `${window.location.origin}/invites/${inviteToken}`;
    await navigator.clipboard.writeText(url);
    toast.success('Invite link copied.');
  }

  async function removeMember(userId: string, name: string) {
    if (!token) return;
    if (!window.confirm(`Remove ${name} from this workspace?`)) return;
    setError('');
    try {
      await api.removeMember(token, workspaceId, userId);
      await load(token);
      toast.success('Member removed.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to remove member.';
      setError(message);
      toast.error(message);
    }
  }

  if (!ready || !token) return null;

  const myMembership = members.find((m) => m.userId === user?.id);
  const canManage = myMembership ? ELEVATED_ROLES.includes(myMembership.role) : false;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p>
        <Link href={`/workspaces/${workspaceId}`} className="text-sm text-teal-700 hover:underline">
          &larr; {loading ? 'Back to workspace' : workspace?.name}
        </Link>
      </p>
      <h1 className="mb-6 mt-2 text-2xl">Members</h1>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {loading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {!loading && (
        <ul className="mb-8 flex flex-col gap-2">
          {members.map((m) => {
            const isOwner = workspace?.ownerId === m.userId;
            return (
              <li
                key={m.userId}
                className="group flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-gray-900">{m.user.name}</span>
                  <span className="ml-2 text-sm text-gray-500">{m.user.email}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[m.role]}`}>
                    {m.role}
                  </span>
                  {canManage && !isOwner && (
                    <button
                      type="button"
                      onClick={() => removeMember(m.userId, m.user.name)}
                      className="rounded p-1 text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                      aria-label={`Remove ${m.user.name}`}
                      title="Remove member"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && canManage && invites.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Pending invites</h2>
          <ul className="flex flex-col gap-2">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="group flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-gray-900">{inv.email}</span>
                  <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[inv.role]}`}>
                    {inv.role}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => copyInviteLink(inv.token)}
                    className="text-teal-700 hover:underline"
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => revokeInvite(inv.id, inv.email)}
                    className="rounded p-1 text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    aria-label={`Revoke invite to ${inv.email}`}
                    title="Revoke invite"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && canManage && (
        <form onSubmit={sendInvite} className="mb-6 rounded-lg border border-gray-200 p-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Invite by email</h2>
          <p className="mb-3 text-xs text-gray-400">
            Sends a real email with a link to join — works whether or not they have a Shipboard account yet.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded border border-gray-300 px-2.5 py-1.5 text-sm capitalize"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      )}

      {!loading && canManage && (
        <form onSubmit={addMember} className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Add existing member</h2>
          <p className="mb-3 text-xs text-gray-400">
            For when they already have a Shipboard account — adds them immediately, no email sent.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded border border-gray-300 px-2.5 py-1.5 text-sm capitalize"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              {adding ? 'Adding…' : 'Add member'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
