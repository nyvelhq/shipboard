import Link from 'next/link';

export function ViewToggle({
  workspaceId,
  spaceId,
  listId,
  active,
}: {
  workspaceId: string;
  spaceId: string;
  listId: string;
  active: 'list' | 'board';
}) {
  const base = `/workspaces/${workspaceId}/spaces/${spaceId}/lists/${listId}`;
  return (
    <div className="flex gap-2 text-sm">
      <Link
        href={base}
        className={
          active === 'list'
            ? 'rounded-md bg-gray-900 px-3 py-1.5 font-medium text-white'
            : 'rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50'
        }
      >
        List
      </Link>
      <Link
        href={`${base}/board`}
        className={
          active === 'board'
            ? 'rounded-md bg-gray-900 px-3 py-1.5 font-medium text-white'
            : 'rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50'
        }
      >
        Board
      </Link>
    </div>
  );
}
