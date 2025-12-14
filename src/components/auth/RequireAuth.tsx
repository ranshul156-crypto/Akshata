import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <Spinner label="Loading session" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
