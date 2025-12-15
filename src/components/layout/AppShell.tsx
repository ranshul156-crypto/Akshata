import { Outlet } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export function AppShell() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Cycle Tracker</p>
            <p className="truncate text-xs text-text-muted" aria-label="Signed in user email">
              {user?.email ?? 'Signed in'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
