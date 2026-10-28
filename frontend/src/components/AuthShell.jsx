import { Logo } from "./Layout";

export default function AuthShell({ title, subtitle, children, wide = false }) {
  return (
    <div className="min-h-screen bg-paper px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-5xl justify-center sm:justify-start"><Logo /></div>
      <div className={`mx-auto ${wide ? "max-w-2xl" : "max-w-md"} rounded-lg border border-line bg-white p-6 sm:p-8`}>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function RoleTabs({ role, onChange }) {
  return (
    <div className="mb-6 grid grid-cols-2 rounded-md bg-paper p-1" role="tablist" aria-label="Account type">
      {["student", "recruiter"].map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={role === r}
          onClick={() => onChange(r)}
          className={`rounded px-3 py-2 text-sm font-semibold capitalize ${role === r ? "bg-white text-campus-600 shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
