import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthShell, { RoleTabs } from "../../components/AuthShell";
import { Button, Field, Input } from "../../components/ui";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "../../hooks/useForm";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [role, setRole] = useState(
    params.get("role") === "recruiter" ? "recruiter" : "student"
  );

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const { bind, values } = useForm({
    email: "",
    password: "",
  });

  const flash = sessionStorage.getItem("cc_flash");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    sessionStorage.removeItem("cc_flash");

    try {
      const user = await login({ ...values, role });
      navigate(`/${user.role}`, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue to CampusConnect."
    >
      <RoleTabs role={role} onChange={setRole} />

      {flash && !error && (
        <p
          className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800"
          role="status"
        >
          {flash}
        </p>
      )}

      {error && (
        <p
          className="mb-4 rounded-md bg-red-50 p-3 text-sm text-brick"
          role="alert"
        >
          {error}
        </p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input
            {...bind("email")}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Input
              {...bind("password")}
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        <div className="text-right text-sm">
          <Link
            to="/forgot-password"
            className="text-campus-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={busy} className="w-full">
          Log in as {role}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link
          to={`/register?role=${role}`}
          className="font-semibold text-campus-600 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}