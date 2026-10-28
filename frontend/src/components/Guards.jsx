import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./ui";

export function RequireRole({ role }) {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return <Outlet />;
}

/** Logged-in users visiting /login or /register go straight to their dashboard. */
export function RedirectIfLoggedIn({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  return user ? <Navigate to={`/${user.role}`} replace /> : children;
}
