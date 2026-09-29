import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api-client';

export function AdminLoginPage() {
  const { user, login, bootstrapping } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/admin';

  if (!bootstrapping && user) {
    return <Navigate to={next} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl"
      >
        <h1 className="text-xl font-semibold text-white">Admin sign in</h1>
        <p className="text-sm text-slate-500">
          Use the seeded admin from <code className="text-slate-400">api:seed</code>.
        </p>
        {error && (
          <p className="rounded-md bg-red-950/80 px-3 py-2 text-sm text-red-200">{error}</p>
        )}
        <label className="block text-sm">
          <span className="text-slate-400">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-cyan-600 py-2 font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
        <Link to="/" className="block text-center text-sm text-slate-500 hover:text-slate-300">
          ← Back to map
        </Link>
      </form>
    </div>
  );
}
