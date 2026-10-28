import { Check, X } from "lucide-react";
import { PIPELINE, STATUS, fmtDate } from "../api/format";

/** The application journey: Applied → Under review → Shortlisted → Interview → Selected. */
export default function Pipeline({ status, history = [] }) {
  const reached = {};
  history.forEach((h) => (reached[h.new_status] = h.changed_at));
  const rejected = status === "rejected";
  const steps = rejected ? [...PIPELINE.filter((s) => reached[s]), "rejected"] : PIPELINE;

  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:gap-0" aria-label="Application progress">
      {steps.map((step, i) => {
        const isRejected = step === "rejected";
        const done = Boolean(reached[step]) || (!rejected && PIPELINE.indexOf(step) <= PIPELINE.indexOf(status));
        const current = step === status;
        return (
          <li key={step} className="flex flex-1 items-start gap-3 sm:flex-col sm:gap-2">
            <div className="flex items-center sm:w-full">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${
                  isRejected ? "bg-brick" : done ? (current ? "bg-campus-500 ring-4 ring-campus-100" : "bg-campus-500") : "border-2 border-line bg-white"
                }`}
              >
                {isRejected ? <X className="h-3.5 w-3.5" /> : done && <Check className="h-3.5 w-3.5" />}
              </span>
              {i < steps.length - 1 && (
                <span className={`hidden h-0.5 flex-1 sm:block ${reached[steps[i + 1]] || (!rejected && done && PIPELINE.indexOf(steps[i + 1]) <= PIPELINE.indexOf(status)) ? "bg-campus-500" : "bg-line"}`} />
              )}
            </div>
            <div>
              <p className={`text-sm ${current ? "font-semibold text-ink" : done ? "text-ink" : "text-muted"}`}>{STATUS[step].label}</p>
              {reached[step] && <p className="text-xs text-muted">{fmtDate(reached[step])}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
