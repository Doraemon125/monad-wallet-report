import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, X, CalendarDays, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/hooks/use-wallet";
import { getReportPriceMon, REPORT_PRICE_MON } from "@/lib/contract";

interface PremiumReportModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (year: number) => void;
  /** Year initially selected in the picker. */
  initialYear: number;
  /** Years the user can generate a report for. */
  availableYears: number[];
}

/**
 * Pre-payment / year picker modal.
 *
 * - The user picks the fiscal year the report should cover.
 * - The 1 MON price is presented as a *symbolic annual fee* per report
 *   (one wallet + one year = 1 MON, paid once, on-chain). This wording
 *   makes it clear it is a service fee for aggregation, not a
 *   subscription.
 * - Confirming here just triggers the on-chain generateReport(year)
 *   transaction flow — the transaction itself is handled by
 *   GeneratingReport.
 */
export function PremiumReportModal({
  open,
  onOpenChange,
  onConfirm,
  initialYear,
  availableYears,
}: PremiumReportModalProps) {
  const { t } = useI18n();
  const { provider } = useWallet();

  const [year, setYear] = useState<number>(initialYear);
  useEffect(() => setYear(initialYear), [initialYear, open]);

  // The contract owner can change the price via updatePrice(), so the
  // modal must read it live instead of hardcoding "1 MON" — otherwise a
  // user could see one price here and be asked to pay a different one in
  // their wallet (bug 1.5).
  const [priceMon, setPriceMon] = useState<string>(REPORT_PRICE_MON);
  useEffect(() => {
    if (!open || !provider) return;
    let cancelled = false;
    getReportPriceMon(provider)
      .then((p) => {
        if (!cancelled) setPriceMon(p);
      })
      .catch(() => {
        // Keep the fallback default if the read fails (e.g. not yet connected).
      });
    return () => {
      cancelled = true;
    };
  }, [open, provider]);
  const priceDisplay = (() => {
    const n = Number(priceMon);
    return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 4 }) : priceMon;
  })();

  const items = [
    t("modal.item.financial"),
    t("modal.item.portfolio"),
    t("modal.item.nft"),
    t("modal.item.tokens"),
    t("modal.item.score"),
    t("modal.item.pdf"),
    t("modal.item.ai"),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-1.5rem)] max-w-md max-h-[calc(100dvh-1rem)] p-0 overflow-hidden border border-[hsl(var(--gold-border))] bg-[hsl(var(--card))] shadow-2xl flex flex-col gap-0"
      >
        {/* Header (no "Premium" wording) */}
        <div className="shrink-0 relative bg-gradient-to-br from-[hsl(var(--gold-strong))]/25 via-[hsl(var(--gold))]/10 to-transparent px-6 pt-6 pb-5 border-b border-[hsl(var(--gold-border))]/60">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(var(--gold-strong))] to-[hsl(var(--gold))] flex items-center justify-center shadow-md">
              <Sparkles className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
            </div>
          </div>

          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {t("modal.title.plain")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("modal.subtitle.plain")}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {/* Year picker */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
              <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
                {t("modal.year.label")}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {availableYears.map((y) => {
                const active = y === year;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYear(y)}
                    className={`rounded-lg border px-3 py-2 text-sm font-mono font-semibold transition-all ${
                      active
                        ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold-strong))] shadow-inner"
                        : "border-[hsl(var(--gold-border))]/50 bg-[hsl(var(--muted))]/30 hover:border-[hsl(var(--gold))]/60"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("modal.year.help")}
            </p>
          </div>

          {/* Price + billing note */}
          <div className="flex items-end justify-between rounded-xl border border-[hsl(var(--gold-border))]/60 bg-[hsl(var(--muted))]/30 px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
                {t("modal.price.label")}
              </p>
              <p className="mt-0.5 text-3xl font-extrabold text-gold-title leading-none">
                {priceDisplay} <span className="text-lg font-semibold text-[hsl(var(--gold))]">MON</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
                {t("modal.billing")}
              </p>
              <p className="mt-0.5 text-xs font-medium text-foreground">
                {t("modal.billing.symbolic")}
              </p>
            </div>
          </div>

          {/* Symbolic-fee explanation */}
          <div className="flex gap-2 rounded-lg border border-[hsl(var(--gold-border))]/40 bg-[hsl(var(--muted))]/20 px-3 py-2.5">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-[hsl(var(--gold))]" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("modal.symbolic.note", { year })}
            </p>
          </div>

          {/* Feature list */}
          <div>
            <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground mb-2">
              {t("modal.includes")}
            </p>
            <ul className="space-y-1.5">
              {items.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="flex items-center gap-2.5 text-sm"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold-strong))]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-foreground">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center gap-2 border-t border-[hsl(var(--gold-border))]/60 bg-[hsl(var(--muted))]/20 px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 border border-[hsl(var(--gold-border))]/60 hover:bg-[hsl(var(--gold-hover))]"
          >
            <X className="h-4 w-4 mr-1.5" />
            {t("modal.cancel")}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onConfirm(year);
            }}
            className="btn-gold flex-1 h-11 rounded-md"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {t("modal.confirm.plain")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
