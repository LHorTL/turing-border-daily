export type RuleCode = 'R-01' | 'R-02' | 'R-03' | 'R-04' | 'R-05' | 'R-06';

export interface BorderRule {
  code: RuleCode;
  shortLabel: string;
  title: string;
  rule: string;
  kind: 'violation' | 'exemption' | 'intel';
}

export interface AvatarSpec {
  hair: 'bob' | 'short_cap' | 'slick_back' | 'ponytail' | 'hood_helmet';
  glasses: 'none' | 'round' | 'visor' | 'mono';
  collar: 'parka' | 'workwear' | 'suit' | 'medic' | 'armor';
  jaw: number;
  brow: number;
  seed: number;
}

export interface PinnableField {
  id: string;
  fieldLabel: string;
  value: string;
  snippet: string;
}

export interface QuickChip {
  id: string;
  label: string;
  question: string;
}

export interface PublicCase {
  caseNumber: number;
  dateStr: string;
  ticketCode: string;
  name: string;
  role: string;
  sectorOrigin: string;
  passId: string;
  issuedDate: string;
  expiryDate: string;
  entryPurpose: string;
  biometricTemp: string;
  voiceJitter: string;
  acousticNote: string;
  claimedMemory: string;
  openingLine: string;
  avatar: AvatarSpec;
  pinnableFields: PinnableField[];
  quickChips: QuickChip[];
  maxProbes: number;
  maxCitations: number;
}

export type WaveformMode =
  | 'baseline'
  | 'elevated'
  | 'erratic'
  | 'locked_sine'
  | 'flat_smooth'
  | 'jammed';

export interface PublicTelemetry {
  heartRate: number;
  stress: number;
  signalIntegrity: number;
  jammed: boolean;
  fftPeakHz: number;
  waveformMode: WaveformMode;
  mood: string;
}

export type CountermoveType =
  | 'EMP_JAM'
  | 'EMP_BLOCKED'
  | 'BRIBE_OFFER'
  | 'SUPERVISOR_ESCALATION'
  | 'LOGIC_FRACTURE';

export interface CountermoveBanner {
  type: CountermoveType;
  label: string;
  detail: string;
}

export interface TranscriptEntry {
  id: string;
  speaker: 'suspect' | 'inspector' | 'system';
  text: string;
  tag?: string;
  countermove?: CountermoveBanner;
}

export type CitationOutcome = 'VIOLATION_CONFIRMED' | 'EXEMPTION_VERIFIED' | 'MISMATCH';

export interface CitationRecord {
  fieldId: string;
  fieldLabel: string;
  ruleCode: RuleCode;
  outcome: CitationOutcome;
  note: string;
}

export interface PendingBribe {
  offered: boolean;
  resolved?: 'ACCEPTED' | 'REJECTED';
  credits: number;
  prompt: string;
}

export interface FieldTruth {
  fieldId: string;
  fieldLabel: string;
  value: string;
  ruleRef: RuleCode;
  isContradiction: boolean;
  explain: string;
}

export interface XRayAutopsy {
  isSynth: boolean;
  trueId: string;
  classification: 'HUMAN CITIZEN' | 'COVERT SYNTH';
  truthSummary: string;
  fieldTruths: FieldTruth[];
}

export type VerdictDecision = 'PASS' | 'PURGE';
export type InspectorGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface VerdictResult {
  decision: VerdictDecision;
  correct: boolean;
  grade: InspectorGrade;
  score: number;
  percentile: number | null;
  probesUsed: number;
  verifiedCitations: number;
  xray: XRayAutopsy;
  receiptText: string;
  commentShared: boolean;
  sharedCommentId?: string;
}

export interface PublicSessionState {
  probesLeft: number;
  probesUsed: number;
  citationsLeft: number;
  empShieldAvailable: boolean;
  empShieldArmed: boolean;
  bureauTrust: number;
  telemetry: PublicTelemetry;
  transcript: TranscriptEntry[];
  citations: CitationRecord[];
  pendingBribe: PendingBribe | null;
  solved: boolean;
  verdict?: VerdictResult;
}

export interface CommunityStats {
  total: number;
  passCount: number;
  purgeCount: number;
  passPct: number;
  purgePct: number;
  accuracyPct: number;
}

export interface UserStats {
  username: string;
  streak: number;
  bestStreak: number;
  solvedCount: number;
  correctCount: number;
  lastSolvedDate: string | null;
}

export interface ArchiveDateSummary {
  dateStr: string;
  caseNumber: number;
  isToday: boolean;
  solved: boolean;
  grade?: InspectorGrade;
}

export interface SplashPayload {
  dateStr: string;
  caseNumber: number;
  ticketCode: string;
  suspectName: string;
  suspectRole: string;
  passId: string;
  openingExcerpt: string;
  avatar: AvatarSpec;
  community: CommunityStats;
  userStats: UserStats;
  solvedToday: boolean;
  todayGrade?: InspectorGrade;
}

export interface DailyPayload {
  dateStr: string;
  todayStr: string;
  isPractice: boolean;
  caseNumber: number;
  suspect: PublicCase;
  rules: BorderRule[];
  session: PublicSessionState;
  community: CommunityStats;
  userStats: UserStats;
  archiveDates: ArchiveDateSummary[];
}
