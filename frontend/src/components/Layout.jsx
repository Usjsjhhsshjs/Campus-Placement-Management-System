import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell, Briefcase, Building2, CalendarClock, FileText, GraduationCap, LayoutDashboard,
  LogOut, Menu, Search, UserRound, Users, X,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const NAV = {
  student: [
    { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/student/jobs", label: "Browse openings", icon: Search },
    { to: "/student/applications", label: "My applications", icon: FileText },
    { to: "/student/interviews", label: "Interviews", icon: CalendarClock },
    { to: "/student/notifications", label: "Notifications", icon: Bell, badge: true },
    { to: "/student/profile", label: "My profile", icon: UserRound },
  ],
  recruiter: [
    { to: "/recruiter", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/recruiter/postings", label: "Job postings", icon: Briefcase },
    { to: "/recruiter/applicants", label: "Applicants", icon: Users },
    { to: "/recruiter/interviews", label: "Interviews", icon: CalendarClock },
    { to: "/recruiter/notifications", label: "Notifications", icon: Bell, badge: true },
    { to: "/recruiter/profile", label: "Company & profile", icon: Building2 },
  ],
};

export function Logo({ className = "" }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 font-display text-xl font-bold text-campus-600 ${className}`}>
      <GraduationCap className="h-6 w-6" aria-hidden /> CampusConnect
    </Link>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const unread = useQuery({
    queryKey: ["unread"],
    queryFn: async () => (await api.get("/notifications/unread-count")).data.count,
    refetchInterval: 30000,
  });

  const links = (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV[user.role].map(({ to, label, icon: Icon, end, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
              isActive ? "bg-campus-50 text-campus-700" : "text-muted hover:bg-paper hover:text-ink"
            }`
          }
        >
          <Icon className="h-4 w-4" aria-hidden />
          <span className="flex-1">{label}</span>
          {badge && unread.data > 0 && (
            <span className="rounded-full bg-saffron px-1.5 text-xs font-semibold text-white" aria-label={`${unread.data} unread`}>
              {unread.data}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-line pt-4">
      <p className="truncate text-sm font-semibold">{user.full_name}</p>
      <p className="truncate text-xs capitalize text-muted">{user.role} · {user.email}</p>
      <button onClick={logout} className="mt-3 flex items-center gap-2 text-sm font-medium text-brick hover:underline">
        <LogOut className="h-4 w-4" aria-hidden /> Log out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-line bg-white p-4 lg:flex">
        <div>
          <Logo className="mb-6 px-3" />
          {links}
        </div>
        {account}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded p-1.5 hover:bg-paper">
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col justify-between bg-white p-4">
            <div>
              <div className="mb-6 flex items-center justify-between">
                <Logo />
                <button onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
              </div>
              {links}
            </div>
            {account}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
