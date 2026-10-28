import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/AuthShell";
import { Button, Field, Input } from "../../components/ui";
import { api, errorMessage } from "../../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we will prepare a reset link.">
      {sent ? (
        <div className="space-y-3 text-sm" role="status">
          <p className="rounded-md bg-emerald-50 p-3 text-moss">If an account exists for that email, a reset link has been prepared.</p>
          <p className="text-muted">
            If email delivery is not set up on this computer, the link is printed in the backend terminal window
            (look for “DEV ONLY - password reset link”).
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-brick" role="alert">{error}</p>}
          <Field label="Email" htmlFor="email"><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button type="submit" loading={busy} className="w-full">Send reset link</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link to="/login" className="font-semibold text-campus-600 hover:underline">Back to log in</Link></p>
    </AuthShell>
  );
}
