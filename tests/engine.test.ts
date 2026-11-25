import { describe, expect, it } from 'vitest';
import {
  generateDailyCase,
  redactCaseForClient,
  shiftUtcDate,
} from '../src/server/core/caseGenerator';
import {
  applyConfrontCitation,
  applyCountermoveAction,
  applyProbe,
  buildPublicTelemetry,
  computeVerdictScore,
  createInitialSession,
  evaluateVerdict,
} from '../src/server/core/interrogation';

describe('Deterministic daily case engine & Fog-of-War guarantees', () => {
  it('generates identical daily cases for the same UTC date and balanced 365-day calendar', () => {
    const a = generateDailyCase('2026-11-24');
    const b = generateDailyCase('2026-11-24');
    expect(a).toEqual(b);

    let synthCount = 0;
    let humanCount = 0;
    const uniqueNames = new Set<string>();

    for (let i = 0; i < 365; i += 1) {
      const dateStr = shiftUtcDate('2026-10-01', i);
      const c = generateDailyCase(dateStr);
      expect(c.fields.length).toBe(4);
      expect(c.quickChips.length).toBe(4);
      uniqueNames.add(c.name);

      const contradictions = c.fields.filter((f) => f.isContradiction);
      if (c.isSynth) {
        synthCount += 1;
        expect(contradictions.length).toBeGreaterThanOrEqual(2);
      } else {
        humanCount += 1;
        expect(contradictions.length).toBe(0);
      }
    }

    expect(synthCount).toBeGreaterThan(130);
    expect(humanCount).toBeGreaterThan(130);
    expect(uniqueNames.size).toBeGreaterThan(80);
  });

  it('strictly strips all spoiler fields from redacted public case and Turn-0 telemetry', () => {
    // Check both a synth case and a human case
    const dates = ['2026-10-01', '2026-10-04', '2026-10-07', '2026-11-24', '2026-11-25'];
    for (const d of dates) {
      const secret = generateDailyCase(d);
      const pub = redactCaseForClient(secret) as unknown as Record<string, unknown>;

      expect(pub.isSynth).toBeUndefined();
      expect(pub.trueId).toBeUndefined();
      expect(pub.truthSummary).toBeUndefined();
      expect(pub.voiceProfile).toBeUndefined();
      expect(pub.preferredActions).toBeUndefined();
      expect(pub.topicResponses).toBeUndefined();

      const serialized = JSON.stringify(pub);
      expect(serialized).not.toContain(secret.trueId);
      expect(serialized).not.toContain('isContradiction');
      expect(serialized).not.toContain('ruleRef');

      const session = createInitialSession(secret);
      const t0 = buildPublicTelemetry(session, secret);
      expect(t0.waveformMode).toBe('baseline');
      expect(t0.jammed).toBe(false);
    }
  });

  it('accurately evaluates Pin-Field Rule Citations and enforces 3-citation budget', () => {
    // Find a signature SYNTH date (Case #001 = 2026-10-01 -> Chen Mo UNIT-K7)
    const synthCase = generateDailyCase('2026-10-01');
    expect(synthCase.isSynth).toBe(true);
    const violationField = synthCase.fields.find((f) => f.isContradiction)!;

    const session = createInitialSession(synthCase);
    const wrongRule = violationField.ruleRef === 'R-01' ? 'R-05' : 'R-01';

    const miss = applyConfrontCitation(session, synthCase, violationField.id, wrongRule);
    expect(miss.citation?.outcome).toBe('MISMATCH');
    expect(session.citationsLeft).toBe(2);
    expect(session.bureauTrust).toBe(95);

    const hit = applyConfrontCitation(session, synthCase, violationField.id, violationField.ruleRef);
    expect(hit.citation?.outcome).toBe('VIOLATION_CONFIRMED');
    expect(session.citationsLeft).toBe(1);

    // Duplicate check blocked without consuming remaining citation
    const dup = applyConfrontCitation(session, synthCase, violationField.id, violationField.ruleRef);
    expect(dup.error).toBeDefined();
    expect(session.citationsLeft).toBe(1);

    // Human exemption verification (Case #004 = 2026-10-04 -> Lin Jing)
    const humanCase = generateDailyCase('2026-10-04');
    expect(humanCase.isSynth).toBe(false);
    const exemptionField = humanCase.fields.find((f) => f.isExemption && f.ruleRef === 'R-05')!;
    const hSession = createInitialSession(humanCase);
    const cleared = applyConfrontCitation(hSession, humanCase, exemptionField.id, 'R-05');
    expect(cleared.citation?.outcome).toBe('EXEMPTION_VERIFIED');
  });

  it('runs episodic memory replies, EMP jam + Faraday shield interception, and spoiler-free receipts', () => {
    // Chen Mo (2026-10-01) has EMP_JAM preferred action
    const secret = generateDailyCase('2026-10-01');
    const session = createInitialSession(secret);

    const p1 = applyProbe(session, secret, 'You heard a Line 4 train at 02:00 last night?');
    expect(p1.error).toBeUndefined();
    expect(p1.countermove?.type).toBe('EMP_JAM');
    expect(buildPublicTelemetry(session, secret).jammed).toBe(true);

    // Arm Faraday shield -> clears jam immediately
    const shield = applyCountermoveAction(session, 'ACTIVATE_SHIELD');
    expect(shield.error).toBeUndefined();
    expect(buildPublicTelemetry(session, secret).jammed).toBe(false);

    // Follow-up probe on same topic produces episodic non-identical response
    const p2 = applyProbe(session, secret, 'Tell me more about Line 4 again.');
    expect(p2.reply).toContain('already pressed');
    expect(p2.reply).not.toBe(p1.reply);

    // Evaluate verdict & verify spoiler-free receipt leaks ZERO truth tokens
    const verdict = evaluateVerdict(session, secret, 'PURGE', 14, 3, false);
    expect(verdict.correct).toBe(true);
    expect(verdict.receiptText).toContain('#001');
    expect(verdict.receiptText).toContain('Top 14%');
    expect(verdict.receiptText).toContain('Streak 3');

    // STRICT spoiler-free assertions & full-size emoji squares
    expect(verdict.receiptText).not.toContain(secret.trueId);
    expect(verdict.receiptText).not.toContain(secret.name);
    expect(verdict.receiptText).not.toMatch(/\b(SYNTH|HUMAN|PURGE|PASS|R-0[1-6])\b/i);
    expect(verdict.receiptText).not.toContain('▫️');
    expect(verdict.receiptText).toContain('🟦🟦⬜⬜');
  });

  it('maintains 0 voice dossier/polygraph contradictions across 365 days and breaks 1-probe synth oracle', () => {
    let synthTotal = 0;
    let synthVoiceAnomalyAfter1Probe = 0;
    let synthNaturalVoice = 0;
    const distinctOpeningPrefixes = new Set<string>();

    for (let i = 0; i < 365; i += 1) {
      const dateStr = shiftUtcDate('2026-10-01', i);
      const secret = generateDailyCase(dateStr);
      distinctOpeningPrefixes.add(secret.openingLine.slice(0, 18));

      const voiceField = secret.fields.find((f) => f.id === 'voice_acoustic');
      if (voiceField) {
        if (voiceField.isContradiction) {
          expect(secret.voiceProfile).not.toBe('natural');
        } else {
          expect(secret.voiceProfile).toBe('natural');
        }
      }

      if (secret.isSynth) {
        synthTotal += 1;
        const session = createInitialSession(secret);
        applyProbe(session, secret, 'Explain your permit dates.');
        if (session.jammedTurns > 0) {
          applyCountermoveAction(session, 'ACTIVATE_SHIELD');
        }
        const t1 = buildPublicTelemetry(session, secret);
        if (t1.waveformMode === 'flat_smooth' || t1.waveformMode === 'locked_sine') {
          synthVoiceAnomalyAfter1Probe += 1;
        } else {
          synthNaturalVoice += 1;
        }
      }
    }

    expect(synthTotal).toBeGreaterThan(130);
    expect(synthNaturalVoice).toBeGreaterThan(20);
    expect(synthVoiceAnomalyAfter1Probe).toBeLessThan(synthTotal);
    expect(distinctOpeningPrefixes.size).toBeGreaterThanOrEqual(10);
  });

  it('hard-caps 0-probe blind guesses at <= 68 (Grade C) and rewards investigated + rule-cited solves with Grade S (>= 90) on both synth and human cases', () => {
    // 1. Signature SYNTH case (2026-10-01 Chen Mo, R-01 & R-03 violations)
    const synthCase = generateDailyCase('2026-10-01');
    expect(synthCase.isSynth).toBe(true);
    const synthViolations = synthCase.fields.filter((f) => f.isContradiction);
    expect(synthViolations.length).toBeGreaterThanOrEqual(2);

    // (a) 0-probe, 0-confrontation lucky blind guess on SYNTH
    const synthBlindSession = createInitialSession(synthCase);
    const synthBlind = computeVerdictScore(synthBlindSession, synthCase, 'PURGE');
    expect(synthBlind.correct).toBe(true);
    expect(synthBlind.score).toBeLessThanOrEqual(68);
    expect(synthBlind.grade).toBe('C');

    // (b) Thorough 3-probe + verified rule-confronted solve on SYNTH
    const synthThoroughSession = createInitialSession(synthCase);
    applyProbe(synthThoroughSession, synthCase, synthCase.quickChips[0]!.question);
    if (synthThoroughSession.jammedTurns > 0) {
      applyCountermoveAction(synthThoroughSession, 'ACTIVATE_SHIELD');
    }
    applyProbe(synthThoroughSession, synthCase, synthCase.quickChips[1]!.question);
    applyProbe(synthThoroughSession, synthCase, synthCase.quickChips[2]!.question);
    applyConfrontCitation(
      synthThoroughSession,
      synthCase,
      synthViolations[0]!.id,
      synthViolations[0]!.ruleRef
    );
    applyConfrontCitation(
      synthThoroughSession,
      synthCase,
      synthViolations[1]!.id,
      synthViolations[1]!.ruleRef
    );
    const synthThorough = computeVerdictScore(synthThoroughSession, synthCase, 'PURGE');
    expect(synthThorough.correct).toBe(true);
    expect(synthThorough.score).toBeGreaterThanOrEqual(90);
    expect(synthThorough.grade).toBe('S');
    expect(synthThorough.score).toBeGreaterThan(synthBlind.score);

    // (c) Wrong verdict on SYNTH remains <= 35 (Grade D or F)
    const synthWrongBlind = computeVerdictScore(createInitialSession(synthCase), synthCase, 'PASS');
    expect(synthWrongBlind.correct).toBe(false);
    expect(synthWrongBlind.score).toBeLessThanOrEqual(35);
    expect(['D', 'F']).toContain(synthWrongBlind.grade);

    const synthWrongInvestigated = computeVerdictScore(synthThoroughSession, synthCase, 'PASS');
    expect(synthWrongInvestigated.correct).toBe(false);
    expect(synthWrongInvestigated.score).toBeLessThanOrEqual(35);
    expect(['D', 'F']).toContain(synthWrongInvestigated.grade);

    // 2. Signature HUMAN case (2026-10-04 Lin Jing, R-05 exemptions)
    const humanCase = generateDailyCase('2026-10-04');
    expect(humanCase.isSynth).toBe(false);
    const r05Fields = humanCase.fields.filter((f) => f.isExemption && f.ruleRef === 'R-05');
    expect(r05Fields.length).toBeGreaterThanOrEqual(1);

    // (a) 0-probe, 0-confrontation lucky blind guess on HUMAN
    const humanBlindSession = createInitialSession(humanCase);
    const humanBlind = computeVerdictScore(humanBlindSession, humanCase, 'PASS');
    expect(humanBlind.correct).toBe(true);
    expect(humanBlind.score).toBeLessThanOrEqual(68);
    expect(humanBlind.grade).toBe('C');

    // (b) Thorough 4-probe + R-05 exemption-verified solve on HUMAN
    const humanThoroughSession = createInitialSession(humanCase);
    for (const chip of humanCase.quickChips) {
      applyProbe(humanThoroughSession, humanCase, chip.question);
    }
    applyConfrontCitation(humanThoroughSession, humanCase, r05Fields[0]!.id, 'R-05');
    const humanThorough = computeVerdictScore(humanThoroughSession, humanCase, 'PASS');
    expect(humanThorough.correct).toBe(true);
    expect(humanThorough.score).toBeGreaterThanOrEqual(90);
    expect(humanThorough.grade).toBe('S');
    expect(humanThorough.score).toBeGreaterThan(humanBlind.score);

    // (c) Wrong verdict on HUMAN remains <= 35 (Grade D or F)
    const humanWrong = computeVerdictScore(humanThoroughSession, humanCase, 'PURGE');
    expect(humanWrong.correct).toBe(false);
    expect(humanWrong.score).toBeLessThanOrEqual(35);
    expect(['D', 'F']).toContain(humanWrong.grade);

    // 3. Verify scoring invariant holds across 60 consecutive days (both signature & procedural cases)
    for (let i = 0; i < 60; i += 1) {
      const dateStr = shiftUtcDate('2026-10-01', i);
      const c = generateDailyCase(dateStr);
      const rightDecision = c.isSynth ? 'PURGE' : 'PASS';
      const wrongDecision = c.isSynth ? 'PASS' : 'PURGE';

      const blind = computeVerdictScore(createInitialSession(c), c, rightDecision);
      expect(blind.score).toBeLessThanOrEqual(68);
      expect(blind.grade).toBe('C');

      const investigated = createInitialSession(c);
      applyProbe(investigated, c, c.quickChips[0]!.question);
      if (investigated.jammedTurns > 0) {
        applyCountermoveAction(investigated, 'ACTIVATE_SHIELD');
      }
      applyProbe(investigated, c, c.quickChips[1]!.question);
      const evidenceField = c.fields.find((f) =>
        c.isSynth ? f.isContradiction : f.isExemption
      )!;
      applyConfrontCitation(investigated, c, evidenceField.id, evidenceField.ruleRef);

      const solved = computeVerdictScore(investigated, c, rightDecision);
      expect(solved.score).toBeGreaterThanOrEqual(90);
      expect(solved.grade).toBe('S');
      expect(solved.score).toBeGreaterThan(blind.score);

      const wrong = computeVerdictScore(investigated, c, wrongDecision);
      expect(wrong.score).toBeLessThanOrEqual(35);
      expect(['D', 'F']).toContain(wrong.grade);
    }
  });

  it('omits fabricated Top N% on Practice Archive and First-Inspector Daily receipts', () => {
    const secret = generateDailyCase('2026-10-04');

    const archSession = createInitialSession(secret);
    applyProbe(archSession, secret, secret.quickChips[0]!.question);
    const archVerdict = evaluateVerdict(archSession, secret, 'PASS', null, 0, true, 0);
    expect(archVerdict.percentile).toBeNull();
    expect(archVerdict.receiptText).toContain('Practice Archive — Unranked');
    expect(archVerdict.receiptText).not.toMatch(/Top\s+\d+%/i);

    const firstDailySession = createInitialSession(secret);
    applyProbe(firstDailySession, secret, secret.quickChips[0]!.question);
    const firstDailyVerdict = evaluateVerdict(firstDailySession, secret, 'PASS', null, 1, false, 1);
    expect(firstDailyVerdict.percentile).toBeNull();
    expect(firstDailyVerdict.receiptText).toContain('First Inspector Today');
    expect(firstDailyVerdict.receiptText).not.toMatch(/Top\s+\d+%/i);
  });
});
