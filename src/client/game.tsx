import './index.css';

import { StrictMode, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  DailyPayload,
  RuleCode,
  VerdictDecision,
} from '../shared/types';
import { InkPolygraph } from './components/InkPolygraph';
import { PassportPortrait } from './components/PassportPortrait';

function GameApp() {
  const [data, setData] = useState<DailyPayload | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pinnedFieldId, setPinnedFieldId] = useState<string>('');
  const [selectedRule, setSelectedRule] = useState<RuleCode>('R-01');
  const [questionInput, setQuestionInput] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<{ kind: 'ok' | 'err' | 'warn'; text: string } | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);
  const [sharingComment, setSharingComment] = useState<boolean>(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const loadCase = useCallback(async (dateStr?: string) => {
    setBusy(true);
    setStatusNotice(null);
    setCopiedReceipt(false);
    try {
      const qs = dateStr ? `?date=${encodeURIComponent(dateStr)}` : '';
      const res = await fetch(`/api/daily${qs}`);
      const payload = (await res.json()) as DailyPayload & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || `HTTP ${res.status}`);
      }
      setData(payload);
      setSelectedDate(payload.dateStr);
      setPinnedFieldId(payload.suspect.pinnableFields[0]?.id ?? '');
    } catch (err) {
      setStatusNotice({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Failed to load checkpoint dossier.',
      });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadCase();
  }, [loadCase]);

  useEffect(() => {
    if (transcriptEndRef.current && typeof transcriptEndRef.current.scrollIntoView === 'function') {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [data?.session.transcript.length]);

  const handleProbe = async (questionText: string) => {
    if (!data || busy || data.session.solved) return;
    const trimmed = questionText.trim();
    if (!trimmed) return;
    setBusy(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateStr: data.dateStr, question: trimmed }),
      });
      const out = (await res.json()) as {
        error?: string;
        session?: DailyPayload['session'];
        countermove?: { label: string; detail: string } | null;
      };
      if (!res.ok || !out.session) {
        throw new Error(out.error || 'Probe failed.');
      }
      setData((prev) => (prev ? { ...prev, session: out.session! } : prev));
      setQuestionInput('');
      if (out.countermove) {
        setStatusNotice({ kind: 'warn', text: `${out.countermove.label}: ${out.countermove.detail}` });
      }
    } catch (err) {
      setStatusNotice({ kind: 'err', text: err instanceof Error ? err.message : 'Probe failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleProbeSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleProbe(questionInput);
  };

  const handleConfront = async () => {
    if (!data || busy || data.session.solved || !pinnedFieldId) return;
    setBusy(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/confront', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateStr: data.dateStr,
          fieldId: pinnedFieldId,
          ruleCode: selectedRule,
        }),
      });
      const out = (await res.json()) as {
        error?: string;
        citation?: { outcome: string; note: string };
        session?: DailyPayload['session'];
      };
      if (!res.ok || !out.session) {
        throw new Error(out.error || 'Citation check failed.');
      }
      setData((prev) => (prev ? { ...prev, session: out.session! } : prev));
      if (out.citation) {
        setStatusNotice({
          kind:
            out.citation.outcome === 'VIOLATION_CONFIRMED'
              ? 'err'
              : out.citation.outcome === 'EXEMPTION_VERIFIED'
                ? 'ok'
                : 'warn',
          text: out.citation.note,
        });
      }
    } catch (err) {
      setStatusNotice({ kind: 'err', text: err instanceof Error ? err.message : 'Confront failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleCountermove = async (action: 'ACTIVATE_SHIELD' | 'REJECT_BRIBE' | 'ACCEPT_BRIBE') => {
    if (!data || busy || data.session.solved) return;
    setBusy(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/countermove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateStr: data.dateStr, action }),
      });
      const out = (await res.json()) as {
        error?: string;
        message?: string;
        session?: DailyPayload['session'];
      };
      if (!res.ok || !out.session) {
        throw new Error(out.error || 'Action failed.');
      }
      setData((prev) => (prev ? { ...prev, session: out.session! } : prev));
      if (out.message) {
        setStatusNotice({ kind: action === 'ACCEPT_BRIBE' ? 'warn' : 'ok', text: out.message });
      }
    } catch (err) {
      setStatusNotice({ kind: 'err', text: err instanceof Error ? err.message : 'Action failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleVerdict = async (decision: VerdictDecision) => {
    if (!data || busy || data.session.solved) return;
    setBusy(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateStr: data.dateStr, decision }),
      });
      const out = (await res.json()) as {
        error?: string;
        session?: DailyPayload['session'];
        community?: DailyPayload['community'];
        userStats?: DailyPayload['userStats'];
      };
      if (!res.ok || !out.session) {
        throw new Error(out.error || 'Verdict failed.');
      }
      setData((prev) => {
        if (!prev) return prev;
        const nextArchive = prev.archiveDates.map((item) =>
          item.dateStr === prev.dateStr
            ? { ...item, solved: true, grade: out.session?.verdict?.grade }
            : item
        );
        return {
          ...prev,
          session: out.session!,
          community: out.community ?? prev.community,
          userStats: out.userStats ?? prev.userStats,
          archiveDates: nextArchive,
        };
      });
    } catch (err) {
      setStatusNotice({ kind: 'err', text: err instanceof Error ? err.message : 'Verdict failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleShareComment = async () => {
    if (!data || sharingComment || !data.session.verdict) return;
    setSharingComment(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/share-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateStr: data.dateStr }),
      });
      const out = (await res.json()) as {
        shared?: boolean;
        commentId?: string;
        fallbackCopyOnly?: boolean;
        message?: string;
        receiptText?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(out.error || 'Share failed.');

      if (out.shared) {
        setData((prev) => {
          if (!prev || !prev.session.verdict) return prev;
          return {
            ...prev,
            session: {
              ...prev.session,
              verdict: {
                ...prev.session.verdict,
                commentShared: true,
                sharedCommentId: out.commentId,
              },
            },
          };
        });
        setStatusNotice({
          kind: 'ok',
          text: 'Spoiler-free receipt posted to the Reddit thread.',
        });
      } else {
        if (out.receiptText && navigator.clipboard) {
          await navigator.clipboard.writeText(out.receiptText).catch(() => {});
          setCopiedReceipt(true);
        }
        setStatusNotice({
          kind: 'warn',
          text: out.message || 'Copied receipt to clipboard.',
        });
      }
    } catch (err) {
      setStatusNotice({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Unable to post comment.',
      });
    } finally {
      setSharingComment(false);
    }
  };

  const handleCopyReceipt = async () => {
    const text = data?.session.verdict?.receiptText;
    if (!text) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedReceipt(true);
      setStatusNotice({ kind: 'ok', text: 'Spoiler-free receipt copied to clipboard.' });
    } catch {
      setStatusNotice({ kind: 'warn', text: 'Select the receipt box to copy manually.' });
    }
  };

  const handleResetPractice = async () => {
    if (!data || !data.isPractice || busy) return;
    setBusy(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/reset-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateStr: data.dateStr }),
      });
      const out = (await res.json()) as { error?: string; session?: DailyPayload['session'] };
      if (!res.ok || !out.session) throw new Error(out.error || 'Reset failed.');
      setData((prev) => (prev ? { ...prev, session: out.session! } : prev));
    } catch (err) {
      setStatusNotice({ kind: 'err', text: err instanceof Error ? err.message : 'Reset failed.' });
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-6">
        <div className="text-sm text-[#52525b] mono-nums">
          {statusNotice?.text ?? 'Initializing Silent Protocol Border Desk...'}
        </div>
      </div>
    );
  }

  const { suspect, session, rules, community, userStats, archiveDates } = data;
  const caseStr = String(data.caseNumber).padStart(3, '0');
  const activeRuleObj = rules.find((r) => r.code === selectedRule) ?? rules[0]!;
  const pinnedFieldObj = suspect.pinnableFields.find((f) => f.id === pinnedFieldId);
  const verdict = session.verdict;

  const nextUnsolvedArchive = archiveDates.find((a) => !a.isToday && !a.solved) ?? archiveDates[1];

  return (
    <div className="min-h-screen w-full bg-white text-[#18181b] overflow-x-hidden">
      <div className="max-w-[1280px] mx-auto px-3.5 sm:px-6 py-4 space-y-4">
        {/* Minimal-White Swiss Header Anchor */}
        <header className="pb-3 border-b border-[#e6e8ec] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="w-1 h-6 mt-0.5 rounded-[2px] bg-[#0f766e] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-[22px] font-extrabold tracking-tight leading-none text-[#18181b]">
                  Turing Border: Daily Check
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-[#f0fdfa] text-[#0f766e] border border-[#99f6e4] rounded-[4px] mono-nums">
                  CASE #{caseStr}
                </span>
                {data.isPractice ? (
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#fffbeb] text-[#92400e] border border-[#fde68a] rounded-[4px] mono-nums">
                    ARCHIVE PRACTICE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#f7f8fa] text-[#52525b] border border-[#e6e8ec] rounded-[4px] mono-nums">
                    LIVE DAILY · {data.dateStr}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#52525b] mt-1">
                Inspector <span className="mono-nums font-semibold text-[#18181b]">u/{userStats.username}</span> · Streak{' '}
                <span className="mono-nums font-semibold text-[#18181b]">{userStats.streak}</span> · Cross-check dossier against R-01–R-06, then stamp PASS or PURGE.
              </p>
            </div>
          </div>

          {/* Compact Resource Meters & 7-Day Practice Archive Selector */}
          <div className="flex flex-wrap items-center gap-2 text-xs mono-nums">
            <label className="flex items-center gap-1.5 text-[#52525b]">
              <span className="sr-only">Select Case Date</span>
              <select
                aria-label="Practice Archive Date Selector"
                value={selectedDate ?? data.dateStr}
                onChange={(e) => void loadCase(e.target.value)}
                disabled={busy}
                className="h-8 px-2 rounded-[4px] bg-white border border-[#e6e8ec] text-xs text-[#18181b] cursor-pointer"
              >
                {archiveDates.map((a) => (
                  <option key={a.dateStr} value={a.dateStr}>
                    {a.isToday ? `Today #${String(a.caseNumber).padStart(3, '0')}` : `Archive #${String(a.caseNumber).padStart(3, '0')} (${a.dateStr})`}
                    {a.solved ? ` [${a.grade ?? '✓'}]` : ''}
                  </option>
                ))}
              </select>
            </label>

            <span className="px-2 py-1 rounded-[4px] bg-[#f7f8fa] border border-[#e6e8ec]">
              Probes <strong className="text-[#18181b]">{session.probesLeft}/{suspect.maxProbes}</strong>
            </span>
            <span className="px-2 py-1 rounded-[4px] bg-[#f7f8fa] border border-[#e6e8ec]">
              Citations <strong className="text-[#18181b]">{session.citationsLeft}/{suspect.maxCitations}</strong>
            </span>
            <span className="px-2 py-1 rounded-[4px] bg-[#f7f8fa] border border-[#e6e8ec]">
              Trust <strong className={session.bureauTrust < 80 ? 'text-[#b91c1c]' : 'text-[#18181b]'}>{session.bureauTrust}%</strong>
            </span>

            {!session.solved && (
              <button
                type="button"
                onClick={() => void handleCountermove('ACTIVATE_SHIELD')}
                disabled={busy || !session.empShieldAvailable}
                className={`h-8 px-2.5 rounded-[4px] border text-xs font-semibold transition-colors ${
                  session.empShieldArmed
                    ? 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]'
                    : session.empShieldAvailable
                      ? 'bg-white text-[#0f766e] border-[#0f766e] hover:bg-[#f0fdfa] cursor-pointer'
                      : 'bg-[#f3f4f6] text-[#8b8d94] border-[#e6e8ec] cursor-not-allowed'
                }`}
              >
                {session.empShieldArmed
                  ? 'EMP Shield Armed'
                  : session.empShieldAvailable
                    ? 'Arm EMP Shield'
                    : 'Shield Spent'}
              </button>
            )}
          </div>
        </header>

        {/* Inline Status Notification Strip */}
        {statusNotice && (
          <div
            role="status"
            className={`px-3 py-2 rounded-[6px] border text-xs font-medium flex items-center justify-between gap-2 ${
              statusNotice.kind === 'err'
                ? 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]'
                : statusNotice.kind === 'ok'
                  ? 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]'
                  : 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]'
            }`}
          >
            <span>{statusNotice.text}</span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="text-current opacity-70 hover:opacity-100 cursor-pointer px-1"
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        {/* Main 2-Column Clinical Inspection Desk */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Suspect Dossier + Millimeter-Paper Ink Polygraph */}
          <div className="lg:col-span-5 space-y-4 min-w-0">
            {/* Suspect Identity Strip */}
            <section className="flex items-start gap-3.5 pb-3 border-b border-[#e6e8ec]">
              <PassportPortrait
                avatar={suspect.avatar}
                ticketCode={suspect.ticketCode}
                size="md"
                jammed={session.telemetry.jammed}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-[#18181b] truncate">{suspect.name}</h2>
                  <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-[#f3f4f6] text-[#18181b] border border-[#e6e8ec] rounded-[4px] mono-nums shrink-0">
                    {suspect.ticketCode}
                  </span>
                </div>
                <p className="text-xs font-medium text-[#52525b]">{suspect.role}</p>
                <p className="text-xs text-[#8b8d94]">{suspect.sectorOrigin}</p>
                <div className="pt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] mono-nums text-[#52525b]">
                  <span>
                    PASS <strong className="text-[#18181b]">{suspect.passId}</strong>
                  </span>
                  <span>
                    ISSUED <strong className="text-[#18181b]">{suspect.issuedDate}</strong>
                  </span>
                </div>
              </div>
            </section>

            {/* Dossier Ledger Table with Inline 1-Click Pin Buttons */}
            <section aria-label="Suspect Dossier" className="border border-[#e6e8ec] rounded-[6px] bg-white overflow-hidden">
              <div className="px-3 py-2 bg-[#f7f8fa] border-b border-[#e6e8ec] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#52525b]">
                  Inspection Dossier
                </h3>
                <span className="text-[11px] text-[#8b8d94]">
                  {session.solved ? 'Verdict locked' : 'Click any row to pin for rule check'}
                </span>
              </div>

              <div className="divide-y divide-[#f0f1f4] text-xs">
                <div className="px-3 py-2 flex items-baseline justify-between gap-2 bg-white">
                  <span className="text-[#8b8d94] shrink-0">Entry Purpose</span>
                  <span className="text-[#18181b] text-right">{suspect.entryPurpose}</span>
                </div>
                <div className="px-3 py-2 flex items-baseline justify-between gap-2 bg-white">
                  <span className="text-[#8b8d94] shrink-0">Pass Expiry</span>
                  <span className="text-[#18181b] font-medium mono-nums text-right">{suspect.expiryDate}</span>
                </div>
                <div className="px-3 py-2 flex items-baseline justify-between gap-2 bg-white">
                  <span className="text-[#8b8d94] shrink-0">Core Temp</span>
                  <span className="text-[#18181b] font-medium mono-nums text-right">{suspect.biometricTemp}</span>
                </div>
                <div className="px-3 py-2 flex items-baseline justify-between gap-2 bg-white">
                  <span className="text-[#8b8d94] shrink-0">Voice Jitter</span>
                  <span className="text-[#18181b] font-medium mono-nums text-right">{suspect.voiceJitter}</span>
                </div>
              </div>

              {/* 4 Pinnable Evidence Rows */}
              <div className="border-t border-[#e6e8ec] divide-y divide-[#e6e8ec]">
                {suspect.pinnableFields.map((field) => {
                  const isPinned = !session.solved && pinnedFieldId === field.id;
                  const latestCitation = [...session.citations]
                    .reverse()
                    .find((c) => c.fieldId === field.id);

                  return (
                    <div
                      key={field.id}
                      className={`px-3 py-2.5 flex items-start justify-between gap-2.5 transition-colors ${
                        isPinned ? 'bg-[#f0fdfa]' : 'bg-white hover:bg-[#f7f8fa]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wide text-[#52525b]">
                            {field.fieldLabel}
                          </span>
                          {latestCitation && (
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[4px] border mono-nums ${
                                latestCitation.outcome === 'VIOLATION_CONFIRMED'
                                  ? 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]'
                                  : latestCitation.outcome === 'EXEMPTION_VERIFIED'
                                    ? 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]'
                                    : 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]'
                              }`}
                            >
                              {latestCitation.outcome === 'VIOLATION_CONFIRMED'
                                ? `${latestCitation.ruleCode} VIOLATION`
                                : latestCitation.outcome === 'EXEMPTION_VERIFIED'
                                  ? `${latestCitation.ruleCode} CLEARED`
                                  : `${latestCitation.ruleCode} NO MATCH`}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#18181b] mt-0.5 leading-snug">{field.value}</p>
                      </div>
                      {!session.solved && (
                        <button
                          type="button"
                          onClick={() => setPinnedFieldId(field.id)}
                          data-testid={`pin-${field.id}`}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-[4px] border shrink-0 cursor-pointer ${
                            isPinned
                              ? 'bg-[#0f766e] text-white border-[#0f766e]'
                              : 'bg-white text-[#18181b] border-[#e6e8ec] hover:border-[#0f766e]'
                          }`}
                        >
                          {isPinned ? 'Pinned' : 'Pin'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Millimeter-Paper Ink Polygraph */}
            <InkPolygraph telemetry={session.telemetry} />
          </div>

          {/* RIGHT COLUMN: Inline Rule Confront Dock + Interrogation + Verdict / X-Ray */}
          <div className="lg:col-span-7 space-y-4 min-w-0">
            {/* Inline 1-Click Pin -> Match Rule -> Confront Dock */}
            {!session.solved && (
              <section
                aria-label="Rule Confront Dock"
                className="border border-[#e6e8ec] rounded-[6px] bg-[#f7f8fa] p-3 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#52525b]">
                    Pin Field → Match Rule → Confront
                  </h3>
                  <span className="text-[11px] text-[#52525b] mono-nums">
                    Pinned:{' '}
                    <strong className="text-[#0f766e]">
                      {pinnedFieldObj ? pinnedFieldObj.fieldLabel : 'Select a dossier field'}
                    </strong>
                  </span>
                </div>

                {/* 6 Compact Scannable Rule Chips (Zero modal hunting!) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {rules.map((rule) => {
                    const active = selectedRule === rule.code;
                    return (
                      <button
                        key={rule.code}
                        type="button"
                        onClick={() => setSelectedRule(rule.code)}
                        data-testid={`rule-chip-${rule.code}`}
                        className={`px-2 py-1.5 rounded-[4px] border text-left text-xs cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#0f766e] text-white border-[#0f766e]'
                            : 'bg-white text-[#18181b] border-[#e6e8ec] hover:border-[#0f766e]'
                        }`}
                      >
                        <span className="font-bold mono-nums">{rule.code}</span>{' '}
                        <span className={active ? 'text-white' : 'text-[#52525b]'}>
                          {rule.shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Rule Summary + Confront CTA */}
                <div className="bg-white border border-[#e6e8ec] rounded-[4px] p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#18181b]">
                      <span className="mono-nums text-[#0f766e]">{activeRuleObj.code}</span> · {activeRuleObj.title}
                    </p>
                    <p className="text-xs text-[#52525b] mt-0.5 leading-snug">{activeRuleObj.rule}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleConfront()}
                    disabled={busy || !pinnedFieldId || session.citationsLeft <= 0}
                    data-testid="confront-btn"
                    className="h-9 px-3.5 rounded-[6px] bg-[#0f766e] hover:bg-[#115e59] disabled:bg-[#f3f4f6] disabled:text-[#8b8d94] text-white text-xs font-semibold shrink-0 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    Confront ({selectedRule})
                  </button>
                </div>
              </section>
            )}

            {/* Inline Bribe Countermove Choice */}
            {!session.solved && session.pendingBribe && !session.pendingBribe.resolved && (
              <section className="border border-[#fde68a] bg-[#fffbeb] rounded-[6px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#92400e] uppercase tracking-wide">
                    Active Countermove · Contraband Bribe
                  </p>
                  <p className="text-xs text-[#18181b] mt-0.5">{session.pendingBribe.prompt}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleCountermove('REJECT_BRIBE')}
                    disabled={busy}
                    className="h-8 px-3 rounded-[4px] bg-[#047857] text-white text-xs font-semibold cursor-pointer"
                  >
                    Reject (+Integrity)
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCountermove('ACCEPT_BRIBE')}
                    disabled={busy}
                    className="h-8 px-3 rounded-[4px] bg-white border border-[#fde68a] text-[#92400e] text-xs font-semibold cursor-pointer"
                  >
                    Pocket Chip (-20 Trust)
                  </button>
                </div>
              </section>
            )}

            {/* Interrogation Transcript Ledger */}
            <section aria-label="Interrogation Log" className="border border-[#e6e8ec] rounded-[6px] bg-white overflow-hidden">
              <div className="px-3 py-2 bg-[#f7f8fa] border-b border-[#e6e8ec] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#52525b]">
                  Interrogation Transcript
                </h3>
                <span className="text-[11px] text-[#52525b] mono-nums">
                  {session.probesUsed}/{suspect.maxProbes} probes used
                </span>
              </div>

              <div className="max-h-[250px] overflow-y-auto divide-y divide-[#f0f1f4] px-3 py-1">
                {session.transcript.map((entry) => (
                  <div key={entry.id} className="py-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wide ${
                          entry.speaker === 'inspector'
                            ? 'text-[#0f766e]'
                            : entry.speaker === 'system'
                              ? 'text-[#52525b]'
                              : 'text-[#18181b]'
                        }`}
                      >
                        {entry.speaker === 'inspector'
                          ? 'Inspector'
                          : entry.speaker === 'system'
                            ? 'Protocol Validator'
                            : suspect.name}
                      </span>
                      {entry.tag && (
                        <span className="text-[10px] font-semibold text-[#8b8d94] mono-nums">
                          {entry.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#18181b] leading-snug">{entry.text}</p>
                    {entry.countermove && (
                      <div className="mt-1 px-2.5 py-1.5 rounded-[4px] bg-[#fffbeb] border border-[#fde68a] text-xs text-[#92400e]">
                        <strong>{entry.countermove.label}:</strong> {entry.countermove.detail}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>

              {/* Quick Chips + Freeform Probe Form */}
              {!session.solved && (
                <div className="p-3 bg-[#f7f8fa] border-t border-[#e6e8ec] space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {suspect.quickChips.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => void handleProbe(chip.question)}
                        disabled={busy || session.probesLeft <= 0}
                        data-testid={`quick-chip-${chip.id}`}
                        className="px-2.5 py-1 rounded-[4px] bg-white border border-[#e6e8ec] hover:border-[#0f766e] disabled:opacity-50 text-xs text-[#18181b] cursor-pointer disabled:cursor-not-allowed transition-colors"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={handleProbeSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      disabled={busy || session.probesLeft <= 0}
                      placeholder={
                        session.probesLeft > 0
                          ? 'Ask a custom question (e.g. "Explain Line 4" or "Blue Pendulum?")...'
                          : 'Probe budget spent — stamp PASS or PURGE below.'
                      }
                      aria-label="Custom interrogation question"
                      className="flex-1 min-w-0 h-9 px-3 rounded-[6px] bg-white border border-[#e6e8ec] text-xs sm:text-sm text-[#18181b] placeholder:text-[#8b8d94] focus:outline-none focus:border-[#0f766e]"
                    />
                    <button
                      type="submit"
                      disabled={busy || session.probesLeft <= 0 || !questionInput.trim()}
                      data-testid="probe-submit-btn"
                      className="h-9 px-4 rounded-[6px] bg-[#18181b] hover:bg-[#52525b] disabled:bg-[#f3f4f6] disabled:text-[#8b8d94] text-white text-xs font-semibold shrink-0 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    >
                      Probe
                    </button>
                  </form>
                </div>
              )}
            </section>

            {/* Tactile Verdict Stamp Bar OR Post-Verdict Scorecard + X-Ray Autopsy */}
            {!session.solved ? (
              <section
                aria-label="Final Verdict Stamps"
                className="border border-[#e6e8ec] rounded-[6px] bg-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#52525b]">
                    Final Checkpoint Stamp
                  </p>
                  <p className="text-xs text-[#8b8d94]">
                    Verdict locks today’s dossier and unlocks the Post-Verdict X-Ray Autopsy.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleVerdict('PASS')}
                    disabled={busy}
                    data-testid="stamp-pass-btn"
                    className="h-10 px-4 rounded-[6px] bg-[#ecfdf5] hover:bg-[#047857] text-[#047857] hover:text-white border border-[#047857] text-xs sm:text-sm font-extrabold tracking-wide cursor-pointer transition-colors"
                  >
                    APPROVE PASS
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleVerdict('PURGE')}
                    disabled={busy}
                    data-testid="stamp-purge-btn"
                    className="h-10 px-4 rounded-[6px] bg-[#b91c1c] hover:bg-[#991b1b] text-white border border-[#b91c1c] text-xs sm:text-sm font-extrabold tracking-wide cursor-pointer transition-colors"
                  >
                    PURGE SYNTH
                  </button>
                </div>
              </section>
            ) : (
              verdict && (
                <section
                  aria-label="Post-Verdict Scorecard and X-Ray Autopsy"
                  data-testid="scorecard-panel"
                  className="border border-[#e6e8ec] rounded-[6px] bg-white overflow-hidden divide-y divide-[#e6e8ec]"
                >
                  {/* Outcome Banner */}
                  <div
                    className={`px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
                      verdict.correct ? 'bg-[#ecfdf5]' : 'bg-[#fef2f2]'
                    }`}
                  >
                    <div>
                      <p
                        className={`text-sm font-extrabold tracking-tight ${
                          verdict.correct ? 'text-[#047857]' : 'text-[#b91c1c]'
                        }`}
                      >
                        {verdict.correct ? 'VERDICT CONFIRMED' : 'CHECKPOINT MISJUDGMENT'} · STAMPED{' '}
                        {verdict.decision}
                      </p>
                      <p className="text-xs text-[#52525b] mt-0.5">
                        True Identity:{' '}
                        <strong className="text-[#18181b] mono-nums">
                          {verdict.xray.classification} ({verdict.xray.trueId})
                        </strong>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mono-nums">
                      <span
                        data-testid="verdict-grade-pill"
                        className="px-2.5 py-1 rounded-[4px] bg-white border border-[#e6e8ec] text-sm font-extrabold text-[#18181b]"
                      >
                        Grade {verdict.grade}
                      </span>
                      <span
                        data-testid="verdict-score-pill"
                        className="px-2 py-1 rounded-[4px] bg-white border border-[#e6e8ec] text-xs font-semibold text-[#18181b]"
                      >
                        {verdict.score}/100
                      </span>
                      {data.isPractice ? (
                        <span
                          data-testid="verdict-rank-pill"
                          className="px-2 py-1 rounded-[4px] bg-[#fffbeb] border border-[#fde68a] text-xs font-semibold text-[#92400e]"
                        >
                          Practice Archive — Unranked
                        </span>
                      ) : verdict.percentile === null ? (
                        <span
                          data-testid="verdict-rank-pill"
                          className="px-2 py-1 rounded-[4px] bg-[#f0fdfa] border border-[#99f6e4] text-xs font-semibold text-[#0f766e]"
                        >
                          {community.total <= 1
                            ? 'First Inspector Today'
                            : `Ranked among ${community.total} inspectors`}
                        </span>
                      ) : (
                        <span
                          data-testid="verdict-rank-pill"
                          className="px-2 py-1 rounded-[4px] bg-white border border-[#e6e8ec] text-xs font-semibold text-[#52525b]"
                        >
                          {community.total < 5
                            ? `Top ${verdict.percentile}% (${community.total} inspectors)`
                            : `Top ${verdict.percentile}% today`}
                        </span>
                      )}
                      {!data.isPractice && (
                        <span className="px-2 py-1 rounded-[4px] bg-white border border-[#e6e8ec] text-xs font-semibold text-[#52525b]">
                          Streak {userStats.streak}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live Community Consensus Split */}
                  <div className="px-4 py-3 space-y-1.5">
                    {community.total > 0 ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs mono-nums">
                          <span className="font-semibold text-[#18181b]">
                            Community Consensus: PURGE {community.purgePct}% · PASS {community.passPct}%
                          </span>
                          <span className="text-[#52525b]">
                            {community.total} {community.total === 1 ? 'inspector' : 'inspectors'} · {community.accuracyPct}% accurate
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-[4px] bg-[#f3f4f6] border border-[#e6e8ec] overflow-hidden flex">
                          <div
                            className="h-full bg-[#b91c1c]"
                            style={{ width: `${community.purgePct}%` }}
                          />
                          <div
                            className="h-full bg-[#047857]"
                            style={{ width: `${community.passPct}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#52525b]">
                          {data.isPractice
                            ? 'Archive Practice — Live subreddit consensus tracks today’s Daily Check'
                            : 'No live subreddit consensus votes recorded for this date yet'}
                        </span>
                        <span className="text-[11px] text-[#8b8d94] mono-nums">
                          Practice stats isolated
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Post-Verdict X-Ray Autopsy */}
                  <div className="px-4 py-3 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#52525b]">
                      Post-Verdict X-Ray Autopsy
                    </h3>
                    <p className="text-xs text-[#18181b] leading-relaxed">{verdict.xray.truthSummary}</p>
                    <div className="divide-y divide-[#f0f1f4] border border-[#e6e8ec] rounded-[4px]">
                      {verdict.xray.fieldTruths.map((ft) => (
                        <div key={ft.fieldId} className="px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[4px] border mono-nums ${
                                ft.isContradiction
                                  ? 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]'
                                  : 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]'
                              }`}
                            >
                              {ft.ruleRef}
                            </span>
                            <strong className="text-[#18181b]">{ft.fieldLabel}</strong>
                          </div>
                          <span className="text-[#52525b] sm:text-right">{ft.explain}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Spoiler-Free Share Receipt & Practice Archive Actions */}
                  <div className="px-4 py-3 bg-[#f7f8fa] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-[#52525b]">
                        Spoiler-Free Comment Receipt
                      </h3>
                      <span className="text-[11px] text-[#8b8d94]">Safe for Reddit comments</span>
                    </div>
                    <pre
                      data-testid="receipt-preview"
                      className="p-2.5 rounded-[4px] bg-white border border-[#e6e8ec] text-xs mono-nums text-[#18181b] whitespace-pre-wrap break-words m-0"
                    >
                      {verdict.receiptText}
                    </pre>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleShareComment()}
                        disabled={sharingComment || verdict.commentShared}
                        data-testid="share-comment-btn"
                        className={`h-9 px-3.5 rounded-[6px] text-xs font-semibold ${
                          verdict.commentShared
                            ? 'bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] cursor-default'
                            : 'bg-[#0f766e] hover:bg-[#115e59] text-white cursor-pointer'
                        }`}
                      >
                        {verdict.commentShared
                          ? 'Posted to Reddit Thread ✓'
                          : sharingComment
                            ? 'Posting...'
                            : 'Post Receipt to Thread'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopyReceipt()}
                        data-testid="copy-receipt-btn"
                        className="h-9 px-3 rounded-[6px] bg-white border border-[#e6e8ec] hover:border-[#0f766e] text-xs font-semibold text-[#18181b] cursor-pointer"
                      >
                        {copiedReceipt ? 'Copied ✓' : 'Copy Receipt'}
                      </button>
                      {nextUnsolvedArchive && (
                        <button
                          type="button"
                          onClick={() => void loadCase(nextUnsolvedArchive.dateStr)}
                          data-testid="next-archive-btn"
                          className="h-9 px-3 rounded-[6px] bg-white border border-[#0f766e] text-xs font-semibold text-[#0f766e] hover:bg-[#f0fdfa] cursor-pointer ml-auto"
                        >
                          Play Practice Archive (#{String(nextUnsolvedArchive.caseNumber).padStart(3, '0')}) →
                        </button>
                      )}
                      {data.isPractice && (
                        <button
                          type="button"
                          onClick={() => void handleResetPractice()}
                          disabled={busy}
                          data-testid="reset-practice-btn"
                          className="h-9 px-3 rounded-[6px] bg-white border border-[#e6e8ec] text-xs font-semibold text-[#52525b] hover:text-[#18181b] cursor-pointer"
                        >
                          Replay Archive Case
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameApp />
  </StrictMode>
);
