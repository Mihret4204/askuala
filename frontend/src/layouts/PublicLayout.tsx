import { Link, Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-wide">SIS Portal</Link>
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <Link to="/login" className="hover:text-white">Login</Link>
            <Link to="/register" className="rounded-full border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Register</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl items-center justify-center px-6 py-16">
        <Outlet />
      </main>
    </div>
  );
}
