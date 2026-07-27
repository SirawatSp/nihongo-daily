import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Unobtrusive "new version available" toast. The service worker never
 * activates mid-session without the user choosing to reload.
 */
export default function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <p className="text-sm">New version available</p>
      <div className="flex gap-2">
        <button
          onClick={() => setNeedRefresh(false)}
          className="min-h-11 rounded-lg px-3 text-sm text-zinc-500"
        >
          Later
        </button>
        <button
          onClick={() => void updateServiceWorker(true)}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white dark:bg-accent-dark"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
