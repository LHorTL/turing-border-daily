import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState, type MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import type { SplashPayload } from '../shared/types';
import { PassportPortrait } from './components/PassportPortrait';

function SplashApp() {
  const [data, setData] = useState<SplashPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/splash')
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json() as Promise<SplashPayload>;
      })
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load daily case.');
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLaunch = async (e: MouseEvent<HTMLButtonElement>) => {
    if (window.self === window.top) {
      window.location.href = '/game.html';
      return;
    }
    try {
      await requestExpandedMode(e.nativeEvent, 'game');
    } catch {
      window.location.href = '/game.html';
    }
  };

  if (error) {
    return (
      <div className="h-full w-full bg-white p-4 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-[2px] bg-[#0f766e] shrink-0" />
          <h1 className="text-base font-extrabold tracking-tight text-[#18181b]">
            TURING BORDER · DAILY CHECK
          </h1>
        </div>
        <p className="text-sm text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca] rounded-[6px] px-3 py-2">
          Unable to load today’s dossier ({error}).
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-9 px-4 rounded-[6px] bg-[#0f766e] text-white text-sm font-semibold cursor-pointer self-start"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full w-full bg-white px-4 py-3 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-[2px] bg-[#0f766e] shrink-0" />
          <span className="text-sm font-extrabold tracking-tight text-[#18181b]">
            TURING BORDER · DAILY CHECK
          </span>
        </div>
        <div className="border border-[#e6e8ec] bg-[#f7f8fa] rounded-[6px] h-24" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#8b8d94] mono-nums">Loading today’s checkpoint...</span>
          <span className="h-9 w-32 rounded-[6px] bg-[#f3f4f6]" />
        </div>
      </div>
    );
  }

  const caseStr = String(data.caseNumber).padStart(3, '0');
  const hasVotes = data.community.total > 0;

  return (
    <main className="h-full w-full max-w-[680px] mx-auto bg-white px-3.5 py-3 flex flex-col justify-between overflow-hidden">
      {/* Compact Header Anchor */}
      <header className="flex items-center justify-between gap-2 pb-2 border-b border-[#e6e8ec]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1 h-5 rounded-[2px] bg-[#0f766e] shrink-0" aria-hidden="true" />
          <h1 className="text-[15px] font-extrabold tracking-tight text-[#18181b] truncate">
            Turing Border
          </h1>
          <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-[#f0fdfa] text-[#0f766e] border border-[#99f6e4] rounded-[4px] mono-nums shrink-0">
            #{caseStr}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mono-nums text-[11px]">
          <span className="text-[#52525b] hidden sm:inline">{data.dateStr}</span>
          <span className="px-1.5 py-0.5 rounded-[4px] bg-[#f7f8fa] border border-[#e6e8ec] text-[#18181b] font-semibold">
            Streak {data.userStats.streak}
          </span>
          {data.solvedToday && data.todayGrade && (
            <span className="px-1.5 py-0.5 rounded-[4px] bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857] font-bold">
              Grade {data.todayGrade}
            </span>
          )}
        </div>
      </header>

      {/* Suspect Intake Preview Strip */}
      <section className="flex items-center gap-3 bg-[#f7f8fa] border border-[#e6e8ec] rounded-[6px] px-3 py-2.5">
        <PassportPortrait avatar={data.avatar} ticketCode={data.ticketCode} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-[#18181b] truncate">{data.suspectName}</p>
            <span className="text-[11px] text-[#52525b] mono-nums shrink-0">{data.ticketCode}</span>
          </div>
          <p className="text-xs text-[#52525b] truncate">
            {data.suspectRole} · <span className="mono-nums">{data.passId}</span>
          </p>
          <p className="text-xs text-[#18181b] mt-1 line-clamp-2 leading-snug">
            “{data.openingExcerpt}”
          </p>
        </div>
      </section>

      {/* Live Community PASS / PURGE Split */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] mono-nums tabular-nums">
          <span className="font-semibold text-[#52525b] truncate">
            {hasVotes
              ? `PURGE ${data.community.purgePct}% · PASS ${data.community.passPct}%`
              : 'LIVE DAILY CONSENSUS'}
          </span>
          <span
            data-testid="splash-verdict-count"
            className={`px-2 py-0.5 rounded-[4px] border shrink-0 tabular-nums ${
              hasVotes
                ? 'bg-[#f0fdfa] border-[#99f6e4] text-[#0f766e] font-bold'
                : 'bg-[#f7f8fa] border-[#e6e8ec] text-[#18181b] font-semibold'
            }`}
          >
            {hasVotes
              ? `${data.community.total} ${data.community.total === 1 ? 'inspector' : 'inspectors'} ruled today`
              : "Be today's first inspector"}
          </span>
        </div>
        <div className="w-full h-2 rounded-[4px] bg-[#f3f4f6] border border-[#e6e8ec] overflow-hidden flex">
          {hasVotes ? (
            <>
              <div
                className="h-full bg-[#b91c1c]"
                style={{ width: `${data.community.purgePct}%` }}
                aria-label={`Purge ${data.community.purgePct}%`}
              />
              <div
                className="h-full bg-[#047857]"
                style={{ width: `${data.community.passPct}%` }}
                aria-label={`Pass ${data.community.passPct}%`}
              />
            </>
          ) : (
            <div className="h-full w-1/2 bg-[#0f766e] opacity-25" />
          )}
        </div>
      </section>

      {/* 1-Tap Launch Bar */}
      <footer className="flex items-center justify-between gap-3 pt-1">
        <span className="text-[11px] text-[#52525b] truncate">
          60s · 4 probes · R-01–R-06
        </span>
        <button
          type="button"
          onClick={handleLaunch}
          className="h-9 px-4 rounded-[6px] bg-[#0f766e] hover:bg-[#115e59] text-white text-xs sm:text-sm font-semibold cursor-pointer shrink-0 transition-colors"
        >
          {data.solvedToday ? 'Open X-Ray & Archive →' : 'Inspect Suspect →'}
        </button>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SplashApp />
  </StrictMode>
);
