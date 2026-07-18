import { motion } from "framer-motion";
import {
  Wallet as WalletIcon,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet, NETWORKS } from "@/hooks/use-wallet";
import { useNativeBalance } from "@/hooks/use-balance";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useI18n } from "@/lib/i18n";

interface ConnectedHomeProps {
  onGenerate: () => void;
  /** Year currently selected for the report. */
  selectedYear: number;
  /** Available years to pick from. */
  availableYears: number[];
  /** Callback when the user picks a different year. */
  onYearChange: (y: number) => void;
}

/**
 * Post-connection view: shows current MON balance, lets the user pick
 * the fiscal year, and offers the big "Generate Report" CTA.
 */
export function ConnectedHome({
  onGenerate,
  selectedYear,
  availableYears,
  onYearChange,
}: ConnectedHomeProps) {
  const { t } = useI18n();
  const { account, network } = useWallet();
  const { balance, isLoading } = useNativeBalance();
  const { copied, copy: copyToClipboard } = useCopyToClipboard();

  const short = account
    ? `${account.slice(0, 6)}\u2026${account.slice(-4)}`
    : "";

  const copy = () => {
    if (!account) return;
    copyToClipboard(account);
  };

  const display =
    balance === null
      ? "\u2014"
      : Number(balance).toLocaleString(undefined, {
          maximumFractionDigits: 4,
          minimumFractionDigits: 2,
        });

  return (
    <div className="relative w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex justify-center">
      {/* ambient */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-[hsl(var(--gold))]/12 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-[hsl(var(--violet))]/14 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass p-5 sm:p-8 lg:p-10 text-center relative overflow-hidden"
        >
          {/* decorative gradient */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[hsl(var(--gold))]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[hsl(var(--violet))]/15 blur-3xl" />

          {/* Network chip */}
          <div className="relative flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--gold-border))] bg-[hsl(var(--muted))]/40 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-[hsl(var(--gold))]">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--gold))] animate-pulse" />
              {NETWORKS[network].name}
            </div>
          </div>

          <h2 className="mt-4 text-[11px] sm:text-sm uppercase tracking-[0.25em] font-mono text-muted-foreground">
            {t("home.balance.label")}
          </h2>

          {/* Balance */}
          <motion.div
            key={display}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mt-2 flex items-end justify-center gap-2 sm:gap-3 flex-wrap"
          >
            <span className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gold-title leading-none break-all">
              {isLoading ? (
                <span className="inline-block h-10 sm:h-14 w-32 sm:w-40 rounded-md bg-[hsl(var(--muted))]/50 animate-pulse" />
              ) : (
                display
              )}
            </span>
            <span className="mb-1 sm:mb-2 text-base sm:text-xl font-semibold text-[hsl(var(--gold))]">
              MON
            </span>
          </motion.div>

          {/* Address */}
          <button
            onClick={copy}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--gold-border))]/60 bg-[hsl(var(--muted))]/30 px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-[hsl(var(--gold))] transition-all"
            title={account ?? ""}
          >
            <WalletIcon className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
            {short}
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
            ) : (
              <Copy className="h-3.5 w-3.5 opacity-60" />
            )}
          </button>

          {/* Year picker */}
          <div className="mt-6 sm:mt-8 rounded-2xl border border-[hsl(var(--gold-border))]/60 bg-[hsl(var(--muted))]/30 px-3 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
              <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
                {t("home.year.label")}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {availableYears.map((y) => {
                const active = y === selectedYear;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => onYearChange(y)}
                    className={`rounded-lg border px-4 py-2 text-sm font-mono font-semibold transition-all ${
                      active
                        ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold-strong))] shadow-inner"
                        : "border-[hsl(var(--gold-border))]/50 bg-[hsl(var(--card))] hover:border-[hsl(var(--gold))]/60 hover:bg-[hsl(var(--gold-hover))]"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t("home.year.help")}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-6">
            <Button
              size="lg"
              onClick={onGenerate}
              className="btn-gold h-14 sm:h-16 w-full px-4 sm:px-8 text-sm sm:text-base rounded-2xl group whitespace-normal"
            >
              <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate">
                {t("home.cta.generate.year", { year: selectedYear })}
              </span>
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
            {t("home.assurance")}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
