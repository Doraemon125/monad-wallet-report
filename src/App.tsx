import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WalletProvider, useWallet } from "@/hooks/use-wallet";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { useReport } from "@/hooks/useReport";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useToast } from "@/hooks/use-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ShieldCheck,
  Languages,
  LogOut,
  Wallet as WalletIcon,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { NETWORKS } from "@/hooks/use-wallet";

import { Landing } from "@/components/Landing";
import { ConnectedHome } from "@/components/ConnectedHome";
import { PremiumReportModal } from "@/components/PremiumReportModal";
import { GeneratingReport } from "@/components/GeneratingReport";
import { ReportDashboard } from "@/components/ReportDashboard";
import { WalletPickerDialog } from "@/components/WalletPickerDialog";

const queryClient = new QueryClient();

/**
 * MONAD WALLET REPORT — premium SaaS flow.
 *
 * Flow states:
 *   landing        →  Not connected. Show hero + connect CTA.
 *   checking       →  Connected. Querying MonadWalletReport on-chain.
 *   home           →  No report on-chain yet. Show "Generate Premium Report".
 *   generating     →  generateReport(year) tx sent. Animated loading screen.
 *   dashboard      →  Final report view (Hero + KPI cards + Wallet Score).
 *
 * The MonadWalletReport smart contract (see src/lib/contract.ts and
 * src/hooks/useReport.ts) is the single source of truth for whether a
 * report already exists for the connected wallet + current year. Nothing
 * about report existence is cached in localStorage.
 */
type FlowState = "landing" | "checking" | "home" | "generating" | "dashboard";

/**
 * Years the user can pick from when generating a report.
 *
 * Monad mainnet launched in 2025, so reports for anything earlier would
 * have no on-chain data. We cap the historical window at MONAD_MAINNET_YEAR
 * and only include years that actually exist relative to "today".
 */
const MONAD_MAINNET_LAUNCH_YEAR = 2025;
function getReportYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = MONAD_MAINNET_LAUNCH_YEAR; y <= currentYear; y++) years.push(y);
  return years.reverse(); // most recent first
}

/* ------------------------------------------------------------------ */
/*  Language toggle (kept in App.tsx to avoid new files)               */
/* ------------------------------------------------------------------ */
function LanguageToggle() {
  const { lang, toggleLang, t } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLang}
      aria-label={t("header.lang.toggle")}
      className="h-9 gap-1.5 rounded-full border border-[hsl(var(--gold-border))] bg-[hsl(var(--card))] px-3 text-xs font-semibold text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-hover))] transition-all duration-300 hover:scale-105"
    >
      <Languages className="h-3.5 w-3.5" />
      <span className="font-mono uppercase tracking-wider">
        {lang === "en" ? "EN" : "ES"}
      </span>
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/*  Header — minimal (no tabs, no explorer feel)                        */
/* ------------------------------------------------------------------ */
function WalletMenu({ onReset }: { onReset: () => void }) {
  const { t } = useI18n();
  const { account, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const { copied, copy: copyToClipboard } = useCopyToClipboard();

  if (!account) return null;
  const short = `${account.slice(0, 6)}…${account.slice(-4)}`;

  const copy = () => copyToClipboard(account);

  const handleDisconnect = () => {
    setOpen(false);
    disconnect();
    onReset();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--gold-border))]/60 bg-[hsl(var(--muted))]/50 px-3 py-1.5 font-mono text-xs hover:border-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-hover))] transition-all"
          aria-label={t("wallet.menu.aria")}
        >
          <WalletIcon className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
          <span>{short}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-64 p-2 border border-[hsl(var(--gold-border))] bg-[hsl(var(--card))]"
      >
        <div className="px-2 py-2 border-b border-[hsl(var(--gold-border))]/40 mb-1">
          <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            {t("wallet.menu.address")}
          </p>
          <p className="text-xs font-mono break-all mt-0.5">{account}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[hsl(var(--gold-hover))] transition-colors"
        >
          {copied ? (
            <Check className="h-4 w-4 text-[hsl(var(--gold))]" />
          ) : (
            <Copy className="h-4 w-4 text-[hsl(var(--gold))]" />
          )}
          {copied ? t("wallet.menu.copied") : t("wallet.menu.copy")}
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger))]/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t("wallet.menu.disconnect")}
        </button>
      </PopoverContent>
    </Popover>
  );
}

function AppHeader({
  onReset,
}: {
  onReset: () => void;
}) {
  const { t } = useI18n();
  const { isConnected, network } = useWallet();

  return (
    <header className="sticky top-0 z-30 border-b border-[hsl(var(--gold-border))]/60 bg-[hsl(var(--card))]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={onReset}
          className="flex items-center gap-2 shrink-0 group"
          aria-label={t("brand.name")}
        >
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[hsl(var(--gold-strong))] to-[hsl(var(--gold))] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <ShieldCheck className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
          </div>
          <div className="leading-tight text-left">
            <p className="text-sm font-bold tracking-tight">{t("brand.name")}</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[hsl(var(--gold))] font-mono">
              {t("brand.tag")}
            </p>
          </div>
        </button>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {isConnected && (
            <>
              <Badge
                variant="outline"
                className="hidden sm:flex border-[hsl(var(--gold-border))] py-1.5 px-3"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--gold))] mr-2 animate-pulse" />
                {NETWORKS[network].name}
              </Badge>
              <WalletMenu onReset={onReset} />
            </>
          )}
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Flow container                                                     */
/* ------------------------------------------------------------------ */
function AppFlow() {
  const { t } = useI18n();
  const { isConnected, connect, account, network } = useWallet();
  const { toast } = useToast();
  const [state, setState] = useState<FlowState>("landing");
  const [modalOpen, setModalOpen] = useState(false);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // MonadWalletReport contract — single source of truth for report access.
  const { checkReport, getReport, generateReport } = useReport();

  // Whenever the wallet connects, the account changes, or the user
  // picks a different year — consult the contract directly (never
  // localStorage) to decide the next screen for that year.
  useEffect(() => {
    let cancelled = false;

    async function syncWithContract() {
      if (!isConnected || !account) {
        setState("landing");
        setModalOpen(false);
        setAlreadyGenerated(false);
        return;
      }

      setState("checking");
      try {
        const exists = await checkReport(selectedYear);
        if (cancelled) return;

        if (exists) {
          await getReport(selectedYear);
          if (cancelled) return;
          setAlreadyGenerated(true);
          setState("dashboard");
        } else {
          setAlreadyGenerated(false);
          setState("home");
        }
      } catch (err: any) {
        if (cancelled) return;
        toast({
          title: "Contract error",
          description: err?.message || "Could not read MonadWalletReport contract.",
          variant: "destructive",
        });
        setAlreadyGenerated(false);
        setState("home");
      }
    }

    syncWithContract();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account, selectedYear, network]);

  const handleConfirmGenerate = (year: number) => {
    setSelectedYear(year);
    // Move to the loading screen; the actual generateReport(year) tx is
    // triggered from inside GeneratingReport via the `run` prop below.
    setState("generating");
  };

  const runGenerateReport = async () => {
    return await generateReport(selectedYear);
  };

  const handleGenerateError = (message: string) => {
    toast({
      title: t("err.toast.title"),
      description: message,
      variant: "destructive",
    });
    setState("home");
  };

  const handleGenerateDone = () => {
    setAlreadyGenerated(true);
    setState("dashboard");
  };

  const resetToStart = () => {
    setModalOpen(false);
    setSelectedYear(new Date().getFullYear());
    if (!isConnected) {
      setState("landing");
    } else {
      setState(alreadyGenerated ? "dashboard" : "home");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[hsl(var(--background))] text-foreground transition-colors duration-300">
      <AppHeader onReset={resetToStart} />

      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          {state === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <Landing onConnect={connect} />
            </motion.div>
          )}

          {state === "checking" && (
            <motion.div
              key="checking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="min-h-[calc(100vh-4rem)] flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--gold))]" />
                <p className="text-sm font-mono uppercase tracking-widest">
                  {t("checking.contract")}
                </p>
              </div>
            </motion.div>
          )}

          {state === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <ConnectedHome
                selectedYear={selectedYear}
                availableYears={getReportYears()}
                onYearChange={setSelectedYear}
                onGenerate={() => setModalOpen(true)}
              />
            </motion.div>
          )}

          {state === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <GeneratingReport
                year={selectedYear}
                run={runGenerateReport}
                onDone={handleGenerateDone}
                onError={handleGenerateError}
              />
            </motion.div>
          )}

          {state === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            >
              <ReportDashboard
                alreadyGenerated={alreadyGenerated}
                year={selectedYear}
                availableYears={getReportYears()}
                onYearChange={setSelectedYear}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <PremiumReportModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConfirm={handleConfirmGenerate}
        initialYear={selectedYear}
        availableYears={getReportYears()}
      />
      <WalletPickerDialog />

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <WalletProvider>
            <AppFlow />
          </WalletProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
