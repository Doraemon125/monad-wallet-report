import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Blocks,
  Receipt,
  Wallet as WalletIcon,
  Image as ImageIcon,
  Award,
  FileText,
  Check,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import type { ContractTransactionReceipt } from "ethers";
import { useI18n } from "@/lib/i18n";
import { useWallet, NETWORKS } from "@/hooks/use-wallet";
import {
  useTransactions,
  useInternalTransactions,
  useTokenTransactions,
  useNftTransactions,
} from "@/hooks/use-monadscan";

interface GeneratingReportProps {
  onDone: () => void;
  /**
   * On-chain generateReport(year) call. Must resolve with the mined
   * transaction receipt so we can show its hash and explorer link.
   */
  run?: () => Promise<ContractTransactionReceipt | void>;
  /** Called if `run` throws (e.g. tx rejected or reverted). */
  onError?: (message: string) => void;
  /** Year the user is generating the report for. */
  year: number;
  /** Estimated visual duration in ms of the analysis animation. */
  duration?: number;
}

type TxPhase = "pending" | "success" | "failed";

/**
 * Translate raw wallet/RPC errors into short, human-readable messages.
 * We look at codes first (fastest, most reliable) and then fall back to
 * simple substring checks on the raw message.
 */
function friendlyTxError(
  err: any,
  t: (k: string, params?: Record<string, string | number>) => string
): string {
  const raw = (err?.shortMessage || err?.reason || err?.message || "")
    .toString()
    .toLowerCase();

  // Numeric codes commonly used by MetaMask / EIP-1193
  const code = err?.code ?? err?.error?.code;
  if (code === 4001 || code === "ACTION_REJECTED") return t("err.rejected");
  if (code === -32002) return t("err.pending");
  if (code === -32603) return t("err.rpc");

  if (!raw) return t("gen.tx.reverted");

  if (raw.includes("user rejected") || raw.includes("user denied"))
    return t("err.rejected");
  if (raw.includes("insufficient funds")) return t("err.insufficient");
  if (raw.includes("already generated") || raw.includes("already exists"))
    return t("err.already");
  if (raw.includes("network") || raw.includes("chain")) return t("err.network");
  if (raw.includes("timeout") || raw.includes("timed out"))
    return t("err.timeout");
  if (raw.includes("nonce")) return t("err.nonce");
  if (raw.includes("revert") || raw.includes("execution reverted"))
    return t("err.reverted");

  return t("gen.tx.reverted");
}

/**
 * Two-phase premium report generation:
 *
 *   1. TRANSACTION PHASE — the on-chain generateReport(year) tx is sent.
 *      We show a clear card: "Transacción pendiente" while the wallet
 *      confirms + the network mines. Once the receipt arrives we flip
 *      to "Transacción exitosa" (with the explorer link) or, on failure,
 *      "Transacción fallida" with the error and a Retry button.
 *
 *   2. ANALYSIS PHASE — only AFTER the transaction is confirmed as
 *      successful, we start the actual wallet-analysis animation
 *      (blockchain scan, transactions, NFTs, score, PDF).
 */
export function GeneratingReport({
  onDone,
  run,
  onError,
  year,
  duration = 7500,
}: GeneratingReportProps) {
  const { t } = useI18n();
  const { network } = useWallet();
  const explorer = NETWORKS[network].explorer;

  const [txPhase, setTxPhase] = useState<TxPhase>("pending");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [analysisStarted, setAnalysisStarted] = useState(false);

  /*
   * The wallet-side confirmation prompt must only appear ONCE per report
   * generation. Without this guard, React StrictMode (in dev) or any
   * remount would re-run the effect and fire a second wallet request,
   * which is exactly the "don't molest me every time" bug reported by
   * the user. We latch a ref the very first time the effect runs; every
   * subsequent invocation is a no-op.
   */
  const startedRef = useRef(false);

  // --------- Kick off the transaction as soon as this screen mounts. ---------
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!run) {
      // No transaction to run — skip straight to the analysis phase (dev only).
      setTxPhase("success");
      setAnalysisStarted(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const receipt = await run();
        if (cancelled) return;
        // ethers v6: ContractTransactionReceipt has `hash` and `status` (1 = ok).
        const anyR = receipt as any;
        if (anyR?.hash) setTxHash(anyR.hash);
        const ok = anyR?.status === undefined || Number(anyR.status) === 1;
        if (ok) {
          setTxPhase("success");
          // Small pause so the user actually reads the success card,
          // THEN start the analysis animation.
          window.setTimeout(() => {
            if (!cancelled) setAnalysisStarted(true);
          }, 900);
        } else {
          setTxPhase("failed");
          setTxError(t("gen.tx.reverted"));
        }
      } catch (err: any) {
        if (cancelled) return;
        // The user used their wallet's own "cancel"/"speed up" feature on a
        // stuck transaction. ethers surfaces this as a TRANSACTION_REPLACED
        // error instead of the original promise settling normally.
        if (err?.code === "TRANSACTION_REPLACED") {
          if (err.cancelled) {
            setTxPhase("failed");
            setTxError(t("err.cancelledByUser"));
          } else {
            // Sped up / repriced — same transaction, just mined under a
            // different hash. It went through: treat it as a success.
            const rep = err.receipt as any;
            if (rep?.hash) setTxHash(rep.hash);
            setTxPhase("success");
            window.setTimeout(() => {
              if (!cancelled) setAnalysisStarted(true);
            }, 900);
          }
          return;
        }

        const code = err?.code ?? err?.error?.code;
        const isRejection =
          err?.isUserRejection === true ||
          code === 4001 ||
          code === "ACTION_REJECTED";

        if (isRejection) {
          // The user cancelled in their wallet — this isn't a "failure"
          // that needs a Retry button and an extra manual step, it's a
          // deliberate no. Go back to the previous screen right away
          // instead of parking them on a failed-transaction card.
          onError?.(t("err.rejected"));
          return;
        }

        setTxPhase("failed");
        setTxError(friendlyTxError(err, t));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // ---------------- Analysis animation (runs after tx success). ----------------
  const steps = [
    { key: "gen.step.blockchain", icon: Blocks },
    { key: "gen.step.tx", icon: Receipt },
    { key: "gen.step.balance", icon: WalletIcon },
    { key: "gen.step.nft", icon: ImageIcon },
    { key: "gen.step.score", icon: Award },
    { key: "gen.step.pdf", icon: FileText },
  ] as const;

  // Prefetch the report data as soon as the tx succeeds. These hooks share
  // their cache (by query key) with ReportDashboard, so this both warms
  // the cache for a snappier dashboard AND tells us when the real work is
  // actually done.
  const { isLoading: txDataLoading } = useTransactions();
  const { isLoading: internalTxDataLoading } = useInternalTransactions();
  const { isLoading: tokenDataLoading } = useTokenTransactions();
  const { isLoading: nftDataLoading } = useNftTransactions();
  const dataReady =
    !txDataLoading && !internalTxDataLoading && !tokenDataLoading && !nftDataLoading;

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Stage 1 — paced visual animation, capped at 92%. This is purely for
  // pacing; it does NOT mean the report is actually ready.
  useEffect(() => {
    if (!analysisStarted) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(92, (elapsed / duration) * 92);
      setProgress(p);
      if (elapsed < duration) {
        raf = requestAnimationFrame(tick);
      } else {
        setMinTimeElapsed(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisStarted]);

  // Step advance timers — walks through all but the LAST step during the
  // paced animation. The final step only completes once data is ready.
  useEffect(() => {
    if (!analysisStarted) return;
    const perStep = duration / steps.length;
    const timers: number[] = [];
    steps.slice(0, -1).forEach((_, i) => {
      timers.push(window.setTimeout(() => setCurrentStep(i), i * perStep));
    });
    timers.push(
      window.setTimeout(
        () => setCurrentStep(steps.length - 1),
        (steps.length - 1) * perStep
      )
    );
    return () => timers.forEach((tt) => window.clearTimeout(tt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisStarted]);

  // Stage 2 — only finish (100%, last step, and onDone) once BOTH the
  // paced animation has had time to play AND the report data has actually
  // finished loading. Previously this screen jumped to "100%" purely on a
  // fixed timer regardless of whether Etherscan/BlockVision had responded,
  // so a slow network could land the user on a dashboard still loading
  // (bug 2.10 — the bar was decorative).
  useEffect(() => {
    if (!analysisStarted || !minTimeElapsed || !dataReady) return;
    setProgress(100);
    setCurrentStep(steps.length);
    const tt = window.setTimeout(onDone, 400);
    return () => window.clearTimeout(tt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisStarted, minTimeElapsed, dataReady]);

  // Reaccionar de inmediato al rechazo REAL desde la wallet:
  // el bloque `catch` del efecto de arriba llama a `onError` en cuanto
  // detecta código 4001 / ACTION_REJECTED / `isUserRejection`, por lo que
  // la interfaz vuelve automáticamente al home sin necesidad de un botón
  // manual ni mensaje intermedio.

  // Además: si el usuario cierra la extensión de la wallet sin clic en
  // "Reject" formal, muchos wallets no rechazan la promesa. Detectamos
  // ese caso escuchando `visibilitychange`: cuando el tab vuelve a
  // primer plano después de haber estado oculto (típico al cerrar el
  // popup del wallet) y seguimos en "pending", intentamos re-verificar
  // el estado; si sigue pendiente sin respuesta tras un margen corto,
  // asumimos que fue cerrado y volvemos al home. Esto ocurre de forma
  // silenciosa, sin mostrar mensajes redundantes.
  useEffect(() => {
    if (txPhase !== "pending") return;
    let closedTimer: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      // El tab volvió a primer plano. Damos un pequeño margen: si la tx
      // realmente se aprobó, la promesa se resolverá enseguida y este
      // timer se limpia. Si sigue "pending" pasado el margen, asumimos
      // que la ventana del wallet fue cerrada.
      if (closedTimer !== null) window.clearTimeout(closedTimer);
      closedTimer = window.setTimeout(() => {
        if (txPhase === "pending") {
          onError?.(t("err.rejected"));
        }
      }, 1500);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (closedTimer !== null) window.clearTimeout(closedTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txPhase]);

  // When the user hits "Retry" after a failure we bubble that up so App
  // sends them back to the home step.
  const handleRetry = () => {
    onError?.(txError || t("gen.tx.reverted"));
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-14 overflow-hidden">
      {/* ambient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <motion.div
          className="absolute top-1/3 left-1/4 h-80 w-80 rounded-full bg-[hsl(var(--gold))]/15 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-[hsl(var(--gold))]/10 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <AnimatePresence mode="wait">
          {!analysisStarted ? (
            /* ============ Phase 1: transaction status ============ */
            <motion.div
              key="tx"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="card-gold p-8 sm:p-10 text-center"
            >
              <TxStatusBadge phase={txPhase} t={t} />

              <h2 className="mt-6 text-2xl font-bold tracking-tight">
                {txPhase === "pending"
                  ? t("gen.tx.title.pending")
                  : txPhase === "success"
                  ? t("gen.tx.title.success")
                  : t("gen.tx.title.failed")}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {txPhase === "pending"
                  ? t("gen.tx.subtitle.pending", { year })
                  : txPhase === "success"
                  ? t("gen.tx.subtitle.success", { year })
                  : txError || t("gen.tx.subtitle.failed")}
              </p>

              {/* Transaction hash + explorer link */}
              {txHash && (
                <a
                  href={`${explorer}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--gold-border))]/60 bg-[hsl(var(--muted))]/40 px-3 py-1.5 text-xs font-mono text-[hsl(var(--gold))] hover:text-[hsl(var(--gold-strong))] hover:border-[hsl(var(--gold))] transition-all"
                >
                  <span className="opacity-70">{t("gen.tx.hash")}:</span>
                  <span>
                    {txHash.slice(0, 8)}…{txHash.slice(-6)}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {/* Pending helper */}
              {txPhase === "pending" && (
                <div className="mt-8 rounded-lg border border-[hsl(var(--gold-border))]/40 bg-[hsl(var(--muted))]/30 px-4 py-3 text-left">
                  <p className="text-[10px] uppercase tracking-widest font-mono text-[hsl(var(--gold))]">
                    {t("gen.tx.hint.title")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("gen.tx.hint.body")}
                  </p>
                </div>
              )}

              {/* El flujo de cancelación se actualiza automáticamente
                  cuando el usuario rechaza o cierra la solicitud en su
                  wallet — no mostramos mensajes ni botones adicionales. */}

              {/* Success helper */}
              {txPhase === "success" && (
                <div className="mt-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-left">
                  <p className="text-[10px] uppercase tracking-widest font-mono text-emerald-400">
                    {t("gen.tx.next.title")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("gen.tx.next.body")}
                  </p>
                </div>
              )}

              {/* Failure actions */}
              {txPhase === "failed" && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-8 btn-gold h-11 rounded-md px-6 text-sm"
                >
                  {t("gen.tx.retry")}
                </button>
              )}
            </motion.div>
          ) : (
            /* ============ Phase 2: analysis animation ============ */
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="card-gold p-8 sm:p-10 text-center"
            >
              {/* Animated crest */}
              <div className="mx-auto relative h-24 w-24">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[hsl(var(--gold))]/40"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  style={{
                    borderTopColor: "hsl(var(--gold))",
                    borderRightColor: "transparent",
                    borderBottomColor: "hsl(var(--gold))",
                    borderLeftColor: "transparent",
                  }}
                />
                <motion.div
                  className="absolute inset-3 rounded-full border-2"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{
                    borderTopColor: "transparent",
                    borderRightColor: "hsl(var(--gold-strong))",
                    borderBottomColor: "transparent",
                    borderLeftColor: "hsl(var(--gold-strong))",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="h-10 w-10 rounded-lg bg-gradient-to-br from-[hsl(var(--gold-strong))] to-[hsl(var(--gold))] flex items-center justify-center shadow-lg shadow-[hsl(var(--gold))]/40"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <FileText className="h-5 w-5 text-[hsl(var(--primary-foreground))]" />
                  </motion.div>
                </div>
              </div>

              <h2 className="mt-6 text-2xl font-bold tracking-tight">
                {t("gen.title")}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t("gen.subtitle.year", { year })}
              </p>

              {/* Explorer link stays visible even during analysis */}
              {txHash && (
                <a
                  href={`${explorer}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono text-emerald-400 hover:border-emerald-400 transition-all"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {t("gen.tx.confirmed")} · {txHash.slice(0, 6)}…{txHash.slice(-4)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {/* Progress bar */}
              <div className="mt-8">
                <div className="h-2 w-full rounded-full bg-[hsl(var(--muted))]/50 overflow-hidden border border-[hsl(var(--gold-border))]/40">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-strong))] to-[hsl(var(--gold))]"
                    style={{
                      width: `${progress}%`,
                      backgroundSize: "200% 100%",
                    }}
                    animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  <span>{t("gen.progress")}</span>
                  <span className="text-[hsl(var(--gold))]">
                    {Math.floor(progress)}%
                  </span>
                </div>
              </div>

              {/* Steps */}
              <ul className="mt-8 space-y-2.5 text-left">
                {steps.map((s, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  const Icon = s.icon;
                  return (
                    <li
                      key={s.key}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                        active
                          ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10"
                          : done
                          ? "border-[hsl(var(--gold-border))]/70 bg-[hsl(var(--muted))]/30"
                          : "border-[hsl(var(--gold-border))]/30 bg-transparent opacity-60"
                      }`}
                    >
                      <div
                        className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
                          done
                            ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold-strong))]"
                            : active
                            ? "bg-gradient-to-br from-[hsl(var(--gold-strong))] to-[hsl(var(--gold))] text-[hsl(var(--primary-foreground))] shadow-md"
                            : "bg-[hsl(var(--muted))]/40 text-muted-foreground"
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {done ? (
                            <motion.span
                              key="done"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Check className="h-4 w-4" strokeWidth={3} />
                            </motion.span>
                          ) : active ? (
                            <motion.span
                              key="active"
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 2.4,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <Icon className="h-4 w-4" />
                            </motion.span>
                          ) : (
                            <motion.span
                              key="idle"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <Icon className="h-4 w-4" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <span
                        className={`text-sm font-medium ${
                          active
                            ? "text-foreground"
                            : done
                            ? "text-muted-foreground"
                            : "text-muted-foreground/70"
                        }`}
                      >
                        {t(s.key)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* --------------------------- Sub-components --------------------------- */

function TxStatusBadge({
  phase,
  t,
}: {
  phase: TxPhase;
  t: (k: string, params?: Record<string, string | number>) => string;
}) {
  if (phase === "pending") {
    return (
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-[hsl(var(--gold))]" />
        </motion.div>
        <span className="sr-only">{t("gen.tx.title.pending")}</span>
      </div>
    );
  }
  if (phase === "success") {
    return (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400/50 bg-emerald-400/15 shadow-lg shadow-emerald-500/20"
      >
        <CheckCircle2 className="h-10 w-10 text-emerald-400" strokeWidth={2.2} />
        <span className="sr-only">{t("gen.tx.title.success")}</span>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-rose-400/50 bg-rose-400/15 shadow-lg shadow-rose-500/20"
    >
      <XCircle className="h-10 w-10 text-rose-400" strokeWidth={2.2} />
      <span className="sr-only">{t("gen.tx.title.failed")}</span>
    </motion.div>
  );
}
