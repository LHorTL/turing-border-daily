import { useEffect, useRef } from 'react';
import type { PublicTelemetry } from '../../shared/types';

interface InkPolygraphProps {
  telemetry: PublicTelemetry;
}

export function InkPolygraph({ telemetry }: InkPolygraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(260, Math.floor(rect.width));
      const height = 108;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Pure clinical millimeter paper background (#ffffff + crisp 1px gridlines)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Minor 12px millimeter grid
      ctx.strokeStyle = '#f0f1f4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 12) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      for (let y = 0; y <= height; y += 12) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();

      // Major 60px reference lines + center track separator
      ctx.strokeStyle = '#e6e8ec';
      ctx.beginPath();
      for (let x = 0; x <= width; x += 60) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      ctx.moveTo(0, 56.5);
      ctx.lineTo(width, 56.5);
      ctx.stroke();

      // Track labels
      ctx.fillStyle = '#8b8d94';
      ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.fillText('ECG · PULSE', 6, 12);
      ctx.fillText('FFT · VOCAL TREMOR', 6, 68);

      // Trace 1: ECG Waveform (top channel, y center 32)
      const ecgInk = telemetry.jammed
        ? '#92400e'
        : telemetry.stress >= 60
          ? '#b91c1c'
          : '#0f766e';

      ctx.strokeStyle = ecgInk;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const bpmFactor = Math.max(0.8, (telemetry.heartRate || 74) / 70);
      for (let x = 0; x < width; x += 2) {
        let y = 33;
        if (telemetry.jammed) {
          const n = Math.sin(x * 0.9 + phase * 5.2) * Math.cos(x * 0.37 - phase * 3.1);
          y = 33 + n * 14;
        } else {
          const cycleLen = Math.max(46, Math.round(92 / bpmFactor));
          const pos = ((x + phase * 24 * bpmFactor) % cycleLen) / cycleLen;
          if (pos > 0.14 && pos < 0.2) {
            y -= Math.sin(((pos - 0.14) / 0.06) * Math.PI) * 4;
          } else if (pos >= 0.24 && pos < 0.27) {
            y += 4;
          } else if (pos >= 0.27 && pos < 0.32) {
            const amp = 15 + Math.min(8, telemetry.stress * 0.1);
            y -= Math.sin(((pos - 0.27) / 0.05) * Math.PI) * amp;
          } else if (pos >= 0.32 && pos < 0.36) {
            y += 6;
          } else if (pos >= 0.48 && pos < 0.62) {
            y -= Math.sin(((pos - 0.48) / 0.14) * Math.PI) * 5;
          }
        }
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Trace 2: Acoustic FFT Tremor Waveform (bottom channel, y center 84)
      // Keep neutral clinical ink (#18181b) unless EMP-jammed (#92400e) so players deduce via waveform & Hz, not color hints.
      const fftInk = telemetry.jammed ? '#92400e' : '#18181b';

      ctx.strokeStyle = fftInk;
      ctx.lineWidth = 1.35;
      ctx.beginPath();

      for (let x = 0; x < width; x += 2) {
        let y = 85;
        if (telemetry.jammed) {
          y = 85 + Math.sin(x * 1.1 - phase * 6.0) * 12;
        } else if (telemetry.waveformMode === 'locked_sine') {
          // Exact artificial 4.00 Hz sine wave signature
          y = 85 + Math.sin(x * 0.16 + phase * 3.8) * 12;
        } else if (telemetry.waveformMode === 'flat_smooth') {
          // Over-smoothed synthetic vocal envelope
          y = 85 + Math.sin(x * 0.05 + phase * 1.4) * 2.2;
        } else if (telemetry.waveformMode === 'erratic') {
          y =
            85 +
            Math.sin(x * 0.11 + phase * 2.7) * 7 +
            Math.sin(x * 0.29 - phase * 4.1) * 5 +
            Math.cos(x * 0.07 + phase * 1.2) * 3;
        } else if (telemetry.waveformMode === 'elevated') {
          y =
            85 +
            Math.sin(x * 0.09 + phase * 2.1) * 5 +
            Math.sin(x * 0.23 - phase * 3.0) * 3.5;
        } else {
          // Neutral overlapping Turn-0 baseline (zero spoiler!)
          y =
            85 +
            Math.sin(x * 0.08 + phase * 1.8) * 4 +
            Math.sin(x * 0.19 - phase * 2.4) * 2.5;
        }
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.035;
      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, [telemetry]);

  const statusPillClass = telemetry.jammed
    ? 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]'
    : telemetry.stress >= 60
      ? 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]'
      : 'bg-[#f7f8fa] text-[#52525b] border-[#e6e8ec]';

  return (
    <section aria-label="Ink Polygraph" className="border border-[#e6e8ec] rounded-[6px] bg-white overflow-hidden">
      <div className="px-3 py-2 bg-[#f7f8fa] border-b border-[#e6e8ec] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 mono-nums">
          <span className="text-[#52525b]">
            BPM <strong className="text-[#18181b]">{telemetry.jammed ? '--' : telemetry.heartRate}</strong>
          </span>
          <span className="text-[#52525b]">
            STRESS <strong className="text-[#18181b]">{telemetry.jammed ? 'ERR' : `${telemetry.stress}%`}</strong>
          </span>
          <span className="text-[#52525b]">
            FFT <strong className="text-[#18181b]">{telemetry.jammed ? 'JAM' : `${telemetry.fftPeakHz.toFixed(2)}Hz`}</strong>
          </span>
        </div>
        <span className={`px-2 py-0.5 text-[11px] font-semibold border rounded-[4px] mono-nums ${statusPillClass}`}>
          {telemetry.mood}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-[108px] block"
        aria-label="Live ECG and acoustic tremor polygraph chart"
      />
    </section>
  );
}
