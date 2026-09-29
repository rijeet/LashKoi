import { Outlet, Link } from 'react-router';

export function SeoLayout() {
  return (
    <div className="min-h-[100dvh] bg-slate-950">
      <header className="border-b border-slate-800 px-4 py-3">
        <Link to="/" className="text-sm text-cyan-400 hover:underline">← Map</Link>
      </header>
      <Outlet />
    </div>
  );
}
