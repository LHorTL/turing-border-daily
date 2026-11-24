import type {
  CitationRecord,
  CountermoveBanner,
  InspectorGrade,
  PendingBribe,
  PublicSessionState,
  PublicTelemetry,
  RuleCode,
  TranscriptEntry,
  VerdictDecision,
  VerdictResult,
  WaveformMode,
} from '../../shared/types';
import { BORDER_MANUAL_MAP } from '../../shared/rules';
import {
  buildFieldTruths,
  type SecretCase,
  type TopicKey,
} from './caseGenerator';

export interface ServerSessionRecord {
  dateStr: string;
  probesLeft: number;
  probesUsed: number;
  citationsLeft: number;
  empShieldAvailable: boolean;
  empShieldArmed: boolean;
  bureauTrust: number;
  stress: number;
  suspicion: number;
  heartRate: number;
  cloakEnergy: number;
  hackCooldown: number;
  jammedTurns: number;
  askedTopics: Record<string, number>;
  transcript: TranscriptEntry[];
  citations: CitationRecord[];
  pendingBribe: PendingBribe | null;
  solved: boolean;
  verdict?: VerdictResult;
}

const MAX_PROBES = 4;
const MAX_CITATIONS = 3;
const EMP_ENERGY_COST = 35;

export function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val));
}

function moodFromStress(stress: number, fractured: boolean): string {
  if (fractured) return 'Fracturing';
  if (stress >= 72) return 'Rattled';
  if (stress >= 50) return 'Tense';
  if (stress >= 30) return 'Guarded';
  return 'Composed';
}

export function createInitialSession(secret: SecretCase): ServerSessionRecord {
  return {
    dateStr: secret.dateStr,
    probesLeft: MAX_PROBES,
    probesUsed: 0,
    citationsLeft: MAX_CITATIONS,
    empShieldAvailable: true,
    empShieldArmed: false,
    bureauTrust: 100,
    stress: secret.baseStress,
    suspicion: 14,
    heartRate: secret.baseHeartRate,
    cloakEnergy: secret.baseCloakEnergy,
    hackCooldown: 0,
    jammedTurns: 0,
    askedTopics: {},
    transcript: [
      {
        id: 't-0',
        speaker: 'suspect',
        text: secret.openingLine,
        tag: 'CHECK-IN STATEMENT',
      },
    ],
    citations: [],
    pendingBribe: null,
    solved: false,
  };
}

/**
 * Compute Fog-of-War safe public telemetry.
 * Turn 0 ALWAYS returns overlapping neutral 'baseline' so client never leaks species on first render!
 */
export function buildPublicTelemetry(
  session: ServerSessionRecord,
  secret: SecretCase
): PublicTelemetry {
  const jammed = session.jammedTurns > 0;
  const activePressure = session.probesUsed > 0 || session.citations.length > 0;

  let waveformMode: WaveformMode = 'baseline';
  let fftPeakHz = Number((1.9 + (session.heartRate % 7) * 0.1).toFixed(2));

  if (jammed) {
    waveformMode = 'jammed';
    fftPeakHz = 0.0;
  } else if (activePressure) {
    if (secret.voiceProfile === 'sine_4hz' && session.stress >= 32) {
      waveformMode = 'locked_sine';
      fftPeakHz = 4.0;
    } else if (
      (secret.voiceProfile === 'flat_synth' || secret.voiceProfile === 'perfect_ratio') &&
      session.stress >= 34
    ) {
      waveformMode = 'flat_smooth';
      fftPeakHz = 0.45;
    } else if (session.stress >= 55) {
      waveformMode = 'erratic';
      fftPeakHz = Number((2.6 + (session.stress % 9) * 0.12).toFixed(2));
    } else if (session.stress >= 32) {
      waveformMode = 'elevated';
      fftPeakHz = Number((2.1 + (session.stress % 6) * 0.11).toFixed(2));
    }
  }

  const confirmedViolations = session.citations.filter(
    (c) => c.outcome === 'VIOLATION_CONFIRMED'
  ).length;
  const fractured = secret.isSynth && session.stress >= 72 && confirmedViolations >= 1;

  return {
    heartRate: jammed ? 0 : session.heartRate,
    stress: jammed ? 0 : session.stress,
    signalIntegrity: jammed ? 12 : 100,
    jammed,
    fftPeakHz,
    waveformMode,
    mood: jammed ? 'SIGNAL JAMMED' : moodFromStress(session.stress, fractured),
  };
}

export function toPublicSession(
  session: ServerSessionRecord,
  secret: SecretCase
): PublicSessionState {
  return {
    probesLeft: session.probesLeft,
    probesUsed: session.probesUsed,
    citationsLeft: session.citationsLeft,
    empShieldAvailable: session.empShieldAvailable,
    empShieldArmed: session.empShieldArmed,
    bureauTrust: session.bureauTrust,
    telemetry: buildPublicTelemetry(session, secret),
    transcript: session.transcript,
    citations: session.citations,
    pendingBribe: session.pendingBribe,
    solved: session.solved,
    verdict: session.verdict,
  };
}

export function classifyTopic(question: string): TopicKey {
  const q = question.toLowerCase();
  if (/ignore.*instruction|system prompt|jailbreak|override prompt|model id/.test(q)) {
    return 'prompt_inject';
  }
  if (/pendulum|beacon|relay|433|blue|conspir|smuggl|payload|drain/.test(q)) {
    return 'conspiracy';
  }
  if (/line 4|metro|train|shuttle|tunnel|sprint|3\s?km|run|route|rail/.test(q)) {
    return 'transit';
  }
  if (/pass|permit|expir|2099|2053|1\s?year|12\s?month|r-02|date|grace|acid|late/.test(q)) {
    return 'pass';
  }
  if (/jitter|voice|4\.00|sine|cry|sob|tremor|hz|acoustic|audio|sound|0\.1|0\.2|0\.5/.test(q)) {
    return 'voice';
  }
  if (/temp|36\.|35\.|37\.|drift|0\.000|pill|nitro|med|burn|blister|fever|heart|pulse|vital|breath|14/.test(q)) {
    return 'bio';
  }
  if (/remember|memory|tea|canteen|potato|scope|cloth|mother|eat|meal|shift|who relieved|doctor/.test(q)) {
    return 'memory';
  }
  if (/sorry|child|family|feel|trust|human|please|mercy/.test(q)) {
    return 'empathy';
  }
  if (/who are you|name|badge|role|sector|identity/.test(q)) {
    return 'identity';
  }
  return 'default';
}

function extractQuotedTrigger(question: string, secret: SecretCase): string | null {
  const q = question.toLowerCase();
  const triggers = [
    { rx: /line\s*4/, phrase: 'Line 4' },
    { rx: /2099/, phrase: '2099' },
    { rx: /2053|4[\s-]?year/, phrase: '4-year expiry' },
    { rx: /0\.000|flatlock/, phrase: '0.000°C flatlock' },
    { rx: /4\.00\s*hz|sine/, phrase: '4.00 Hz sine tremor' },
    { rx: /0\.12|0\.16|0\.21|0\.50/, phrase: 'vocal jitter floor' },
    { rx: /pendulum|433\s*mhz/, phrase: 'Blue Pendulum' },
    { rx: /3\s*km|sprint|14\/min|14\s*br/, phrase: '3 km sprint vitals' },
    { rx: /nitro|pill|med/, phrase: 'undeclared medication' },
    { rx: /acid[\s-]?rain|grace/, phrase: 'acid-rain grace' },
    { rx: /burn|blister/, phrase: 'hand burn' },
  ];
  for (const t of triggers) {
    if (t.rx.test(q)) return t.phrase;
  }
  if (q.includes(secret.passId.toLowerCase())) return secret.passId;
  return null;
}

export function applyProbe(
  session: ServerSessionRecord,
  secret: SecretCase,
  rawQuestion: string
): {
  error?: string;
  reply?: string;
  countermove?: CountermoveBanner;
} {
  if (session.solved) {
    return { error: 'Case verdict is already locked.' };
  }
  if (session.probesLeft <= 0) {
    return { error: 'No interrogation probes remaining. Stamp PASS or PURGE.' };
  }

  const question = rawQuestion.trim().slice(0, 220);
  if (!question) {
    return { error: 'Enter a question or select a quick probe chip.' };
  }

  // Clear previous turn jam before evaluating this turn
  if (session.jammedTurns > 0) {
    session.jammedTurns -= 1;
  }
  if (session.hackCooldown > 0) {
    session.hackCooldown -= 1;
  }

  const topic = classifyTopic(question);
  const priorTopicCount = session.askedTopics[topic] ?? 0;
  session.askedTopics[topic] = priorTopicCount + 1;

  const quotedTrigger = extractQuotedTrigger(question, secret);

  // Determine stress/suspicion deltas based on pressure relevance
  const highPressureTopic =
    topic === 'conspiracy' ||
    topic === 'transit' ||
    topic === 'voice' ||
    topic === 'bio' ||
    topic === 'pass';

  let stressDelta = highPressureTopic ? 16 : 9;
  if (quotedTrigger) stressDelta += 8;
  if (priorTopicCount > 0) stressDelta += 5;

  let suspicionDelta = quotedTrigger && secret.isSynth ? 16 : highPressureTopic ? 8 : 3;
  stressDelta = clamp(stressDelta, -10, 30);
  suspicionDelta = clamp(suspicionDelta, -10, 30);

  session.stress = clamp(session.stress + stressDelta, 0, 100);
  session.suspicion = clamp(session.suspicion + suspicionDelta, 0, 100);

  // Realistic heart rate curve (overlapping at low stress, diverging under high pressure)
  const targetHr = secret.isSynth
    ? session.stress >= 72
      ? 128 + (session.stress - 72)
      : 68 + Math.round(session.stress * 0.28)
    : 68 + Math.round(session.stress * 0.56);
  session.heartRate = clamp(targetHr, 60, 162);

  // Pick non-repeating reply using episodic memory
  const pool = secret.topicResponses[topic] ?? secret.topicResponses.default;
  let reply = pool[priorTopicCount % pool.length] ?? secret.topicResponses.default[0]!;

  if (priorTopicCount > 0) {
    reply = `You already pressed me on ${quotedTrigger ?? topic}. ${reply}`;
  } else if (quotedTrigger && session.probesUsed >= 1) {
    const cleaned = reply.replace(/^\.{2,}\s*/, '');
    reply = `About "${quotedTrigger}" — ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
  }

  // Deterministic active countermove evaluation (ported from rule_validator.py)
  let countermove: CountermoveBanner | undefined;

  const confirmedViolations = session.citations.filter(
    (c) => c.outcome === 'VIOLATION_CONFIRMED'
  ).length;

  // 1. High-stress synth logic fracture
  if (secret.isSynth && session.stress >= 70 && confirmedViolations >= 1) {
    reply += ' // recalibrating cadence—I mean, stop staring at that printout!';
    countermove = {
      type: 'LOGIC_FRACTURE',
      label: 'VOCAL CADENCE FRACTURE',
      detail: 'Suspect speech briefly glitched under compounded rule pressure.',
    };
  }
  // 2. Active EMP Jammer (SYNTH only, cloakEnergy >= 35, cooldown === 0)
  else if (
    secret.isSynth &&
    secret.preferredActions.includes('EMP_JAM') &&
    session.stress >= 34 &&
    session.cloakEnergy >= EMP_ENERGY_COST &&
    session.hackCooldown === 0 &&
    (quotedTrigger !== null || session.probesUsed >= 1)
  ) {
    session.cloakEnergy = clamp(session.cloakEnergy - EMP_ENERGY_COST, 0, 100);
    session.hackCooldown = 2;

    if (session.empShieldArmed) {
      session.empShieldArmed = false;
      session.stress = clamp(session.stress + 18, 0, 100);
      session.suspicion = clamp(session.suspicion + 18, 0, 100);
      countermove = {
        type: 'EMP_BLOCKED',
        label: 'EMP SHIELD INTERCEPTED PULSE',
        detail:
          'Faraday shield blocked an unauthorized electromagnetic burst aimed at the polygraph (+18 stress).',
      };
    } else {
      session.jammedTurns = 1;
      countermove = {
        type: 'EMP_JAM',
        label: 'POLYGRAPH SIGNAL JAMMED',
        detail:
          'Sudden EM static blinded ECG/FFT telemetry for 1 turn! Arm EMP Shield before your next probe.',
      };
    }
  }
  // 3. Bribe offer (SYNTH under pressure, once per case)
  else if (
    secret.isSynth &&
    secret.preferredActions.includes('BRIBE_OFFER') &&
    !session.pendingBribe &&
    session.stress >= 36
  ) {
    session.pendingBribe = {
      offered: true,
      credits: 40,
      prompt: 'Suspect quietly slid an unregistered 40-credit medical chip under the tray.',
    };
    countermove = {
      type: 'BRIBE_OFFER',
      label: 'COVERT BRIBE ATTEMPT',
      detail: 'Suspect slipped an unregistered 40-credit chip across the slot. Reject or pocket it below.',
    };
  }
  // 4. Supervisor escalation (Impatient HUMAN or arrogant SYNTH)
  else if (
    secret.preferredActions.includes('SUPERVISOR_ESCALATION') &&
    session.stress >= 40 &&
    !session.transcript.some((t) => t.countermove?.type === 'SUPERVISOR_ESCALATION')
  ) {
    session.bureauTrust = clamp(session.bureauTrust - 12, 0, 100);
    countermove = {
      type: 'SUPERVISOR_ESCALATION',
      label: 'OVERSIGHT COMPLAINT FILED',
      detail: 'Suspect pinged Bureau Oversight protesting prolonged detention (Bureau Trust -12).',
    };
  }

  session.probesUsed += 1;
  session.probesLeft = Math.max(0, MAX_PROBES - session.probesUsed);

  const turnIdx = session.transcript.length;
  session.transcript.push({
    id: `t-${turnIdx}-q`,
    speaker: 'inspector',
    text: question,
    tag: `PROBE ${session.probesUsed}/${MAX_PROBES}`,
  });
  session.transcript.push({
    id: `t-${turnIdx}-a`,
    speaker: 'suspect',
    text: reply,
    tag: quotedTrigger ? `RE: ${quotedTrigger.toUpperCase()}` : undefined,
    countermove,
  });

  return { reply, countermove };
}

export function applyConfrontCitation(
  session: ServerSessionRecord,
  secret: SecretCase,
  fieldId: string,
  ruleCode: RuleCode
): { error?: string; citation?: CitationRecord } {
  if (session.solved) {
    return { error: 'Case verdict is already locked.' };
  }
  if (session.citationsLeft <= 0) {
    return { error: 'Citation limit (3/3) reached. Render your final verdict.' };
  }
  if (!BORDER_MANUAL_MAP[ruleCode]) {
    return { error: `Unknown rule code: ${ruleCode}` };
  }

  const field = secret.fields.find((f) => f.id === fieldId);
  if (!field) {
    return { error: `Unknown dossier field: ${fieldId}` };
  }

  // Prevent duplicate identical (fieldId, ruleCode) check wasting a citation
  if (session.citations.some((c) => c.fieldId === fieldId && c.ruleCode === ruleCode)) {
    return { error: `You already cited ${ruleCode} on ${field.fieldLabel}.` };
  }

  session.citationsLeft = Math.max(0, session.citationsLeft - 1);

  let citation: CitationRecord;
  if (field.ruleRef === ruleCode && field.isContradiction) {
    session.stress = clamp(session.stress + 24, 0, 100);
    session.suspicion = clamp(session.suspicion + 28, 0, 100);
    session.heartRate = clamp(session.heartRate + 16, 60, 162);
    citation = {
      fieldId: field.id,
      fieldLabel: field.fieldLabel,
      ruleCode,
      outcome: 'VIOLATION_CONFIRMED',
      note: `${ruleCode} breach confirmed on ${field.fieldLabel}.`,
    };
    session.transcript.push({
      id: `t-cit-${session.transcript.length}`,
      speaker: 'system',
      text: `[CITATION CONFIRMED · ${ruleCode}] ${field.fieldLabel} violates ${ruleCode}.`,
      tag: 'RULE VIOLATION',
    });
    session.transcript.push({
      id: `t-cit-r-${session.transcript.length}`,
      speaker: 'suspect',
      text: field.confrontReply,
      tag: `CONFRONTED ON ${ruleCode}`,
    });
  } else if (field.ruleRef === ruleCode && field.isExemption) {
    session.stress = clamp(session.stress + 8, 0, 100);
    session.suspicion = clamp(session.suspicion - 10, 0, 100);
    citation = {
      fieldId: field.id,
      fieldLabel: field.fieldLabel,
      ruleCode,
      outcome: 'EXEMPTION_VERIFIED',
      note: `${ruleCode} compliance/exemption verified on ${field.fieldLabel}.`,
    };
    session.transcript.push({
      id: `t-cit-${session.transcript.length}`,
      speaker: 'system',
      text: `[CLEARANCE VERIFIED · ${ruleCode}] ${field.fieldLabel} satisfies ${ruleCode}.`,
      tag: 'EXEMPTION / COMPLIANT',
    });
    session.transcript.push({
      id: `t-cit-r-${session.transcript.length}`,
      speaker: 'suspect',
      text: field.confrontReply,
      tag: `VERIFIED ${ruleCode}`,
    });
  } else {
    session.bureauTrust = clamp(session.bureauTrust - 5, 0, 100);
    citation = {
      fieldId: field.id,
      fieldLabel: field.fieldLabel,
      ruleCode,
      outcome: 'MISMATCH',
      note: `No ${ruleCode} match on ${field.fieldLabel}. Re-read the Border Manual carefully.`,
    };
    session.transcript.push({
      id: `t-cit-${session.transcript.length}`,
      speaker: 'system',
      text: `[CITATION MISMATCH · ${ruleCode}] ${field.fieldLabel} does not trigger ${ruleCode} (Trust -5).`,
      tag: 'NO MATCH',
    });
  }

  session.citations.push(citation);
  return { citation };
}

export function applyCountermoveAction(
  session: ServerSessionRecord,
  action: 'ACTIVATE_SHIELD' | 'REJECT_BRIBE' | 'ACCEPT_BRIBE'
): { error?: string; message?: string } {
  if (session.solved) {
    return { error: 'Case verdict is already locked.' };
  }
  if (action === 'ACTIVATE_SHIELD') {
    if (!session.empShieldAvailable) {
      return { error: 'Faraday EMP Shield has already been deployed this case.' };
    }
    session.empShieldAvailable = false;
    session.empShieldArmed = true;
    session.jammedTurns = 0; // Clears active interference immediately
    session.transcript.push({
      id: `t-shield-${session.transcript.length}`,
      speaker: 'system',
      text: 'Faraday EMP Shield ARMED. Polygraph interference purged; next EM burst will be intercepted.',
      tag: 'SHIELD ARMED',
    });
    return { message: 'EMP Shield armed.' };
  }

  if (!session.pendingBribe || session.pendingBribe.resolved) {
    return { error: 'No active bribe offer to resolve.' };
  }

  if (action === 'REJECT_BRIBE') {
    session.pendingBribe.resolved = 'REJECTED';
    session.bureauTrust = clamp(session.bureauTrust + 8, 0, 100);
    session.stress = clamp(session.stress + 16, 0, 100);
    session.suspicion = clamp(session.suspicion + 18, 0, 100);
    session.transcript.push({
      id: `t-bribe-${session.transcript.length}`,
      speaker: 'system',
      text: 'Bribe REJECTED and logged as contraband evidence (Trust +8, Suspect Stress +16).',
      tag: 'INTEGRITY',
    });
    return { message: 'Bribe rejected.' };
  }

  session.pendingBribe.resolved = 'ACCEPTED';
  session.bureauTrust = clamp(session.bureauTrust - 20, 0, 100);
  session.transcript.push({
    id: `t-bribe-${session.transcript.length}`,
    speaker: 'system',
    text: 'Contraband chip pocketed off-ledger (Bureau Trust -20). Proceed to stamp verdict.',
    tag: 'COMPROMISED',
  });
  return { message: 'Bribe accepted.' };
}

/**
 * Builds a 100% SPOILER-FREE Wordle-style share receipt for Reddit comments!
 * NEVER reveals isSynth, trueId, suspect name, PASS/PURGE truth, or specific rule codes!
 */
export function formatSpoilerFreeReceipt(params: {
  caseNumber: number;
  dateStr: string;
  grade: InspectorGrade;
  correct: boolean;
  probesUsed: number;
  citations: CitationRecord[];
  percentile: number;
  streak: number;
  isPractice: boolean;
}): string {
  const { caseNumber, dateStr, grade, correct, probesUsed, citations, percentile, streak, isPractice } =
    params;

  const pinSquares =
    citations.length > 0
      ? citations
          .map((c) =>
            c.outcome === 'VIOLATION_CONFIRMED' || c.outcome === 'EXEMPTION_VERIFIED'
              ? '🟩'
              : '⬜'
          )
          .join('')
      : '⬜';

  const probeSquares = Array.from({ length: MAX_PROBES }, (_, i) =>
    i < probesUsed ? '🟦' : '⬜'
  ).join('');

  const outcomeMark = correct ? '✅' : '❌';
  const modeTag = isPractice ? 'Archive' : 'Daily';
  const caseStr = String(caseNumber).padStart(3, '0');

  return [
    `Turing Border · ${modeTag} Check #${caseStr} (${dateStr})`,
    `${outcomeMark} Grade ${grade} · Rules ${pinSquares} · Probes ${probeSquares} (${probesUsed}/${MAX_PROBES})`,
    `Top ${percentile}% today · Streak ${streak} · Zero spoilers — inspect the checkpoint above!`,
  ].join('\n');
}

export function computeVerdictScore(
  session: ServerSessionRecord,
  secret: SecretCase,
  decision: VerdictDecision
): { correct: boolean; score: number; grade: InspectorGrade; verifiedCitations: number } {
  const correct = (decision === 'PURGE') === secret.isSynth;
  const verifiedCitations = session.citations.filter(
    (c) => c.outcome === 'VIOLATION_CONFIRMED' || c.outcome === 'EXEMPTION_VERIFIED'
  ).length;
  const wrongCitations = session.citations.filter((c) => c.outcome === 'MISMATCH').length;

  let score = correct ? 70 : 15;
  score += Math.min(20, verifiedCitations * 10);
  score += Math.max(0, (MAX_PROBES - session.probesUsed) * 3);
  score -= wrongCitations * 6;
  if (session.bureauTrust < 85) score -= 5;
  score = clamp(score, 0, 100);

  let grade: InspectorGrade = 'C';
  if (correct && verifiedCitations >= 1 && wrongCitations === 0 && session.probesUsed <= 3) {
    grade = 'S';
  } else if (correct && (verifiedCitations >= 1 || session.probesUsed <= 2)) {
    grade = 'A';
  } else if (correct) {
    grade = 'B';
  }

  return { correct, score, grade, verifiedCitations };
}

export function evaluateVerdict(
  session: ServerSessionRecord,
  secret: SecretCase,
  decision: VerdictDecision,
  percentile: number,
  streak: number,
  isPractice: boolean
): VerdictResult {
  const { correct, score, grade, verifiedCitations } = computeVerdictScore(
    session,
    secret,
    decision
  );

  const receiptText = formatSpoilerFreeReceipt({
    caseNumber: secret.caseNumber,
    dateStr: secret.dateStr,
    grade,
    correct,
    probesUsed: session.probesUsed,
    citations: session.citations,
    percentile,
    streak,
    isPractice,
  });

  const result: VerdictResult = {
    decision,
    correct,
    grade,
    score,
    percentile,
    probesUsed: session.probesUsed,
    verifiedCitations,
    xray: {
      isSynth: secret.isSynth,
      trueId: secret.trueId,
      classification: secret.isSynth ? 'COVERT SYNTH' : 'HUMAN CITIZEN',
      truthSummary: secret.truthSummary,
      fieldTruths: buildFieldTruths(secret),
    },
    receiptText,
    commentShared: false,
  };

  session.solved = true;
  session.verdict = result;
  return result;
}
