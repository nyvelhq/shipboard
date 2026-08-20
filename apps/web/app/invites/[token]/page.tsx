'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError, InvitePreview } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function InviteAcceptPage() {
  const { token: authToken, user, ready, logout } = useAuth();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const inviteToken = params.token;

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    api
      .getInvite(inviteToken)
      .then(setInvite)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load invite.'))
      .finally(() => setLoading(false));
  }, [inviteToken]);

  async function accept() {
    if (!authToken) return;
    setAccepting(true);
    setError('');
    try {
      const result = await api.acceptInvite(inviteToken, authToken);
      router.push(`/workspaces/${result.workspaceId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to accept invite.');
      setAccepting(false);
    }
  }

  function signInToAccept() {
    const query = new URLSearchParams({
      redirect: `/invites/${inviteToken}`,
      email: invite?.email ?? '',
    });
    router.push(`/login?${query.toString()}`);
  }

  if (!ready || loading) return null;

  return (
    <main className="mx-auto mt-16 max-w-sm px-6">
      <h1 className="mb-1 text-2xl">Shipboard</h1>

      {error && !invite && <p className="text-sm text-red-600">{error}</p>}

      {invite && (
        <>
          <p className="mb-6 text-gray-500">
            <span className="font-medium text-gray-800">{invite.inviterName}</span> invited you to join{' '}
            <span className="font-medium text-gray-800">{invite.workspaceName}</span> as a{' '}
            <span className="capitalize">{invite.role}</span>.
          </p>

          {invite.expired ? (
            <p className="text-sm text-gray-500">This invite has expired — ask for a new one.</p>
          ) : invite.accepted ? (
            <p className="text-sm text-gray-500">
              This invite has already been accepted.{' '}
              <a href="/workspaces" className="text-teal-700 hover:underline">
                Go to your workspaces
              </a>
              .
            </p>
          ) : !authToken ? (
            <button
              type="button"
              onClick={signInToAccept}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Sign in or create an account to accept
            </button>
          ) : user && user.email.toLowerCase() !== invite.email.toLowerCase() ? (
            <div className="text-sm text-gray-600">
              <p className="mb-3">
                This invite was sent to <span className="font-medium">{invite.email}</span>, but you&apos;re signed
                in as <span className="font-medium">{user.email}</span>.
              </p>
              <button
                type="button"
                onClick={() => {
                  logout();
                  signInToAccept();
                }}
                className="text-teal-700 hover:underline"
              >
                Sign out and switch accounts
              </button>
            </div>
          ) : (
            <div>
              {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={accept}
                disabled={accepting}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                {accepting ? 'Joining…' : `Accept and join ${invite.workspaceName}`}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
