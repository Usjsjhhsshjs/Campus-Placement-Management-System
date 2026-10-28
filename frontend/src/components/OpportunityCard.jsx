import { Link } from "react-router-dom";
import { CheckCircle2, Clock, IndianRupee, MapPin } from "lucide-react";
import { TYPE_LABEL, daysLeft, logoSrc, splitList } from "../api/format";
import { Chip } from "./ui";

export function CompanyLogo({ company, size = "h-11 w-11" }) {
  const src = logoSrc(company.logo_url);
  return src ? (
    <img src={src} alt="" className={`${size} shrink-0 rounded-md border border-line object-cover`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-md bg-campus-50 font-display text-lg font-bold text-campus-600`} aria-hidden>
      {company.name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function OpportunityCard({ opp }) {
  return (
    <Link
      to={`/student/jobs/${opp.id}`}
      className="block rounded-lg border border-line bg-white p-5 transition-shadow hover:shadow-md focus-visible:shadow-md"
    >
      <div className="flex items-start gap-4">
        <CompanyLogo company={opp.company} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{opp.title}</h3>
            <Chip>{TYPE_LABEL[opp.type]}</Chip>
          </div>
          <p className="text-sm text-muted">{opp.company.name}</p>
        </div>
        {opp.has_applied ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-moss">
            <CheckCircle2 className="h-4 w-4" /> Applied
          </span>
        ) : !opp.eligible ? (
          <span className="text-xs font-semibold text-muted">Not eligible</span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        {opp.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{opp.location}</span>}
        {opp.compensation && <span className="flex items-center gap-1"><IndianRupee className="h-4 w-4" aria-hidden />{opp.compensation}</span>}
        <span className="flex items-center gap-1 font-medium text-saffron"><Clock className="h-4 w-4" aria-hidden />{daysLeft(opp.deadline)}</span>
      </div>
      {opp.skills && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {splitList(opp.skills).slice(0, 6).map((s) => <Chip key={s}>{s}</Chip>)}
        </div>
      )}
    </Link>
  );
}
