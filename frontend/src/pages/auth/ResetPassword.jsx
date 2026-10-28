import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthShell from "../../components/AuthShell";
import { Button, Field, Input } from "../../components/ui";
import { api, errorMessage } from "../../api/client";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (pw !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Choose a new password">
      {done ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-moss" role="status">
          Password updated. <Link to="/login" className="font-semibold underline">Log in now</Link>
        </p>
      ) : !token ? (
        <p className="text-sm text-brick">This link is missing its token. Request a new reset link.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-brick" role="alert">{error}</p>}
          <Field label="New password" htmlFor="pw" hint="At least 8 characters with a letter and a number">
            <Input id="pw" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm">
            <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </Field>
          <Button type="submit" loading={busy} className="w-full">Update password</Button>
        </form>
      )}
    </AuthShell>
  );
}
