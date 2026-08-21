import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, UserCircle2, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getNavItemsForRole } from '@/features/dashboard/config/nav';
import type { NavItem } from '@/features/dashboard/config/nav';
import type { UserSummary } from '@/types/api';

// ---------------------------------------------------------------------------
// NavList is extracted to module level to satisfy the react-hooks/static-
// components rule (components must not be created inside render functions).
// ---------------------------------------------------------------------------
interface NavListProps {
  items: NavItem[];
  user: UserSummary | null;
  onNav: () => void;
  onLogout: () => void;
}

function NavList({ items, user, onNav, onLogout }: NavListProps) {
  return (
    <>
      <nav className="space-y-0.5" aria-label="Main navigation">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNav}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="mt-auto border-t border-slate-200 pt-6 dark:border-slate-800">
        <NavLink
          to="/dashboard/profile"
          onClick={onNav}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-slate-100 dark:bg-slate-800'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`
          }
        >
          <UserCircle2 className="h-7 w-7 shrink-0 text-slate-400" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-none">
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{user?.role ?? ''}</p>
          </div>
        </NavLink>

        <button
          onClick={onLogout}
          className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// DashboardLayout
// ---------------------------------------------------------------------------
export function DashboardLayout() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getNavItemsForRole(user?.role);

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex min-h-screen">

        {/* ── Desktop sidebar ── */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white/80 px-4 py-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:flex">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SIS</p>
            <h2 className="mt-1 text-lg font-semibold">Student Portal</h2>
          </div>
          <div className="flex flex-1 flex-col">
            <NavList
              items={navItems}
              user={user}
              onNav={closeMobile}
              onLogout={handleLogout}
            />
          </div>
        </aside>

        {/* ── Mobile overlay ── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        {/* ── Mobile drawer ── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white px-4 py-6 transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:hidden ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Mobile navigation"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SIS</p>
              <h2 className="mt-1 text-lg font-semibold">Student Portal</h2>
            </div>
            <button
              onClick={closeMobile}
              className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col">
            <NavList
              items={navItems}
              user={user}
              onNav={closeMobile}
              onLogout={handleLogout}
            />
          </div>
        </aside>

        {/* ── Main area ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold">Student Portal</span>
          </header>

          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>

      </div>
    </div>
  );
}
