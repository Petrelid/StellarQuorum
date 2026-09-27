'use client';

import { t } from "@/lib/i18n";

// Split out of the proposal detail page so that page can stay a server
// component; the buttons need onClick.
export default function VoteButtons() {
  const connectMessage = t("vote.connect");
  return (
    <div className="flex gap-3 mb-3">
      <button onClick={() => alert(connectMessage)} aria-label={`${t("vote.for")} proposal`} className="flex-1 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors">{t("vote.for")}</button>
      <button onClick={() => alert(connectMessage)} className="flex-1 py-2.5 rounded-lg bg-red-800 hover:bg-red-700 text-white font-semibold text-sm transition-colors">{t("vote.against")}</button>
      <button onClick={() => alert(connectMessage)} className="flex-1 py-2.5 rounded-lg bg-[#162032] hover:bg-[#1a2a40] text-slate-300 font-semibold text-sm border border-[#1a2535] transition-colors">{t("vote.abstain")}</button>
    </div>
  );
}
