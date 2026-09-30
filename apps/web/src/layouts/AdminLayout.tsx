import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/context/AuthContext';

export function AdminLayout() {
  const { user, bootstrapping, logout } = useAuth();
  const location = useLocation();

  if (bootstrapping) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-400">
        Checking session…
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="font-semibold text-cyan-400">
            LashKoi Admin
          </Link>
          <Link to="/admin/incidents/new" className="text-sm text-slate-300 hover:text-white">
            New incident
          </Link>
          <Link to="/admin/incidents/import" className="text-sm text-slate-300 hover:text-white">
            Bulk import
          </Link>
          <Link to="/admin/banners" className="text-sm text-slate-300 hover:text-white">
            Banners
          </Link>
          <Link to="/admin/analytics" className="text-sm text-slate-300 hover:text-white">
            Analytics
          </Link>
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-300">
            Public map
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">{user.email}</span>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-900"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
