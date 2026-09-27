import { Check } from "lucide-react";
import { formatNumber, t } from "@/lib/i18n";

// Issue #147: progress toward the quorum a proposal has to clear.
//
// The total is For + Against + Abstain, which is exactly what the contract's
// finalize() adds up before comparing it to quorum_required — abstaining is a
// participation, not a withdrawal, so a reader must not be invited to add only
// the two sides and conclude a proposal is short of turnout when it is not.
//
// The state is carried in words as well as colour. A green bar and an amber bar
// are indistinguishable to a reader with a colour vision deficiency, and
// "will this fail for want of turnout" is the one fact on the page that has to
// survive that.

interface QuorumProgressProps {
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorumRequired: number;
  /** The list-page variant: a thin bar and one line, no heading. */
  compact?: boolean;
}

export default function QuorumProgress({
  forVotes,
  againstVotes,
  abstainVotes,
  quorumRequired,
  compact = false,
}: QuorumProgressProps) {
  const total = forVotes + againstVotes + abstainVotes;
  // A proposal with no quorum requirement is met the moment it exists; the
  // ratio would otherwise be a division by zero.
  const reached = quorumRequired <= 0 || total >= quorumRequired;
  const shortfall = Math.max(0, quorumRequired - total);
  const percentage = quorumRequired <= 0 ? 100 : (total / quorumRequired) * 100;
  // Clamped, so an overshoot reads as a full bar rather than one that spills
  // out of the track.
  const width = Math.min(percentage, 100);
  const rounded = formatNumber(percentage, { maximumFractionDigits: 0 });
  const nothingYet = total === 0;

  const bar = (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={quorumRequired <= 0 ? 0 : quorumRequired}
      aria-valuenow={Math.min(total, quorumRequired <= 0 ? 0 : quorumRequired)}
      aria-valuetext={t(reached ? "proposals.quorumReached" : "proposals.quorumShort", {
        amount: formatNumber(shortfall),
      })}
      aria-label={t("common.quorum")}
      className={`${compact ? "h-1.5" : "h-2"} bg-[#1a2535] rounded-full overflow-hidden`}
    >
      <div
        className={`h-full rounded-full transition-all ${
          reached ? "bg-emerald-500" : nothingYet ? "bg-slate-600" : "bg-amber-500"
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );

  if (compact) {
    return (
      <div className="mt-2">
        {bar}
        <div
          className={`flex items-center gap-1 mt-1.5 text-xs ${reached ? "text-emerald-400" : "text-amber-400"}`}
        >
          {reached && <Check size={12} aria-hidden="true" />}
          <span>
            {reached
              ? t("proposals.quorumReached")
              : t("proposals.ofQuorum", { percentage: rounded })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#1a2535]">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400">{t("common.quorum")}</span>
        <span className={reached ? "text-emerald-400" : nothingYet ? "text-slate-400" : "text-amber-400"}>
          {t("proposals.required", { current: formatNumber(total), required: formatNumber(quorumRequired) })}
        </span>
      </div>
      {bar}
      <div
        className={`flex items-center gap-1 mt-2 text-xs ${reached ? "text-emerald-400" : nothingYet ? "text-slate-500" : "text-amber-400"}`}
      >
        {reached && <Check size={12} aria-hidden="true" />}
        <span>
          {t(reached ? "proposals.quorumReached" : "proposals.quorumShort", {
            amount: formatNumber(shortfall),
          })}
        </span>
      </div>
    </div>
  );
}
