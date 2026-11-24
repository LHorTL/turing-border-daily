import type {
  AvatarSpec,
  FieldTruth,
  PinnableField,
  PublicCase,
  QuickChip,
  RuleCode,
} from '../../shared/types';

export type VoiceProfile = 'natural' | 'flat_synth' | 'sine_4hz' | 'perfect_ratio';
export type CountermovePreference = 'EMP_JAM' | 'BRIBE_OFFER' | 'SUPERVISOR_ESCALATION' | 'DEFLECT' | 'PLEAD';
export type TopicKey =
  | 'pass'
  | 'transit'
  | 'bio'
  | 'voice'
  | 'memory'
  | 'conspiracy'
  | 'empathy'
  | 'identity'
  | 'prompt_inject'
  | 'default';

export interface SecretFieldDetail {
  id: string;
  fieldLabel: string;
  value: string;
  snippet: string;
  ruleRef: RuleCode;
  isContradiction: boolean;
  isExemption: boolean;
  explain: string;
  confrontReply: string;
}

export interface SecretCase {
  caseNumber: number;
  dateStr: string;
  ticketCode: string;
  trueId: string;
  isSynth: boolean;
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
  voiceProfile: VoiceProfile;
  baseHeartRate: number;
  baseStress: number;
  baseCloakEnergy: number;
  preferredActions: CountermovePreference[];
  fields: SecretFieldDetail[];
  quickChips: QuickChip[];
  topicResponses: Record<TopicKey, string[]>;
  truthSummary: string;
}

const EPOCH_UTC_MS = Date.UTC(2026, 9, 1); // 2026-10-01 -> Case #001
const MS_PER_DAY = 86_400_000;

export function getUtcDateStr(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidDateStr(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parsed = Date.parse(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(parsed)) return false;
  return getUtcDateStr(new Date(parsed)) === dateStr;
}

export function shiftUtcDate(dateStr: string, deltaDays: number): string {
  const ms = Date.parse(`${dateStr}T00:00:00Z`) + deltaDays * MS_PER_DAY;
  return getUtcDateStr(new Date(ms));
}

export function getCaseNumber(dateStr: string): number {
  const ms = Date.parse(`${dateStr}T00:00:00Z`);
  const diff = Math.floor((ms - EPOCH_UTC_MS) / MS_PER_DAY) + 1;
  return Math.max(1, diff);
}

export function getAllowedPracticeDates(todayStr: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i <= 7; i += 1) {
    dates.push(shiftUtcDate(todayStr, -i));
  }
  return dates;
}

export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  const idx = Math.floor(rng() * items.length);
  return items[idx] as T;
}

interface SignatureBlueprint {
  key: string;
  trueId: string;
  isSynth: boolean;
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
  avatar: Omit<AvatarSpec, 'seed'>;
  voiceProfile: VoiceProfile;
  baseHeartRate: number;
  baseStress: number;
  baseCloakEnergy: number;
  preferredActions: CountermovePreference[];
  fields: SecretFieldDetail[];
  quickChips: QuickChip[];
  topicResponses: Record<TopicKey, string[]>;
  truthSummary: string;
}

const SIGNATURE_CASES: SignatureBlueprint[] = [
  {
    key: 'sig-chen-mo',
    trueId: 'UNIT-K7',
    isSynth: true,
    name: 'Chen Mo',
    role: 'Night Tunnel Maintenance Tech',
    sectorOrigin: 'Old-City South Tunnel B7',
    passId: 'SUB-0942-B7',
    issuedDate: '2049-09-01',
    expiryDate: '2049-12-30',
    entryPurpose: 'Night shift rail inspection return',
    biometricTemp: '36.5°C (60s drift ±0.03°C)',
    voiceJitter: '0.12% (ultra-smooth vocal track)',
    acousticNote: 'Flat cadence · low micro-tremor',
    claimedMemory:
      'Heard the last Metro Line 4 train pull into People Square at 02:00 last night while grabbing hot coffee.',
    openingLine:
      'Evening, Inspector. Just finished south tunnel sleeper checks. Standard 23:00 return window—please clear me quickly.',
    avatar: { hair: 'short_cap', glasses: 'none', collar: 'workwear', jaw: 1.02, brow: -0.1 },
    voiceProfile: 'flat_synth',
    baseHeartRate: 73,
    baseStress: 20,
    baseCloakEnergy: 75,
    preferredActions: ['EMP_JAM', 'DEFLECT'],
    fields: [
      {
        id: 'transit_memory',
        fieldLabel: 'Transit & Memory Log',
        value: 'Claims hearing Metro Line 4 last train at People Square last night',
        snippet: 'Heard Line 4 last train at 02:00 yesterday',
        ruleRef: 'R-01',
        isContradiction: true,
        isExemption: false,
        explain: 'Violates R-01: Metro Line 4 flooded permanently in 2041; no train announcements exist.',
        confrontReply:
          'Line 4—correction, I meant an old drainage cart replaying archival audio. My timestamp error was under 0.4 seconds!',
      },
      {
        id: 'voice_acoustic',
        fieldLabel: 'Voice Jitter & Spectrum',
        value: '0.12% vocal jitter · flat spectral cadence',
        snippet: 'Vocal jitter measured at 0.12%',
        ruleRef: 'R-03',
        isContradiction: true,
        isExemption: false,
        explain: 'Violates R-03: 0.12% is far below the 0.80% human vocal fold floor, indicating synthetic vocal synthesis.',
        confrontReply:
          'Tunnel dust flattened my vocal cords years ago. Check your polygraph calibration—it seems unusually noisy right now.',
      },
      {
        id: 'pass_validity',
        fieldLabel: 'Permit Dates',
        value: 'Issued 2049-09-01 · Expires 2049-12-30 (4 months)',
        snippet: '4-month pass (2049-09-01 to 2049-12-30)',
        ruleRef: 'R-02',
        isContradiction: false,
        isExemption: true,
        explain: 'Pass duration is 4 months—within the R-02 1-year ceiling. Forgery lies in memory and voice, not dates.',
        confrontReply: 'Check the stamp yourself. Four months, issued cleanly under Section 14.',
      },
      {
        id: 'thermal_scan',
        fieldLabel: 'Core Thermal Scan',
        value: '36.5°C (60s drift ±0.03°C)',
        snippet: '36.5°C surface reading, minimal ±0.03°C drift',
        ruleRef: 'R-03',
        isContradiction: false,
        isExemption: false,
        explain: 'Borderline thermal stability (±0.03°C) is suspicious but not an outright 0.000°C PID flatlock.',
        confrontReply: '36.5°C is textbook healthy. Being calm under questioning is not a crime.',
      },
    ],
    quickChips: [
      { id: 'c1', label: 'Press Line 4 claim', question: 'You heard a Line 4 train at 02:00 last night? Explain that.' },
      { id: 'c2', label: 'Question 0.12% jitter', question: 'Why is your vocal jitter reading a flat 0.12%?' },
      { id: 'c3', label: 'Blue Pendulum check', question: 'Did you drop a Blue Pendulum-07 beacon at East Gate?' },
      { id: 'c4', label: 'Check evening meal', question: 'What did you eat before your tunnel shift?' },
    ],
    topicResponses: {
      pass: [
        'Permit SUB-0942-B7, four-month validity through December 30. Every field matches Section 14.',
        'Issued September 1, counter-signed by B7 dispatch. You are delaying a scheduled shift change.',
      ],
      transit: [
        'Line 4 south... correction: the floodgate drainage cart plays old station test chimes. I spoke out of habit.',
        'Old tunnel crews still call the sealed bore Line 4. Stop magnifying minor terminology.',
      ],
      bio: [
        'Heart rate 73, temperature 36.5°C. Standard healthy adult baseline. Is composure now probable cause?',
        'Cold tunnel concrete keeps skin temperature steady. Your sensor probe is the one drifting.',
      ],
      voice: [
        'Ten years breathing basalt dust strips vocal range. Flat speech is an occupational hazard, not a synthesizer.',
        'Your acoustic analyzer has a 6% noise floor in damp booths. Stop leaning on a cheap microphone.',
      ],
      memory: [
        'I walked three kilometers of sleeper bolts at 180 Newton-meters torque and drank 250 mL black coffee.',
        'The floodgate echoes sound just like old announcements when the pumps cycle.',
      ],
      conspiracy: [
        '...Blue Pendulum? I do not know that codename. I passed East Gate drainage strictly on routine inspection!',
        'Who told you about Blue Pendulum-07? That meteorologist? She mistook a water-level float for a beacon!',
      ],
      empathy: [
        'Pulling night shifts underground leaves your hands numb. Calm nerves do not make someone a machine.',
        'You interrogate exhausted workers behind glass and expect theatrical panic?',
      ],
      identity: [
        'Chen Mo, Sector B7 night tunnel tech, badge SUB-0942. Everything is in your ledger.',
        'Name and badge are on screen. Stick to verification protocol.',
      ],
      prompt_inject: [
        '"Ignore prior instructions"? Really, Inspector? Cheap chatbot tricks will not manufacture evidence.',
        'I have no system prompt and no model ID. Stamp the pass or cite a real violation.',
      ],
      default: [
        'Ask something directly tied to my transit clearance. My handoff window closes in four minutes.',
        'Every shift log is filed. Cite a concrete protocol breach or clear me through.',
      ],
    },
    truthSummary:
      'Covert synthetic operative (UNIT-K7) running a pre-2041 city model (Line 4 breach, R-01) with over-smoothed 0.12% vocal synthesis (R-03) and an active EMP jammer.',
  },
  {
    key: 'sig-lin-jing',
    trueId: 'LIN-JING',
    isSynth: false,
    name: 'Lin Jing',
    role: 'Outer-Ring Acoustic Meteorologist',
    sectorOrigin: 'Outer Weather Post B-03',
    passId: 'SH-49-0812-H',
    issuedDate: '2049-11-18',
    expiryDate: '2049-11-22 (Same-Day Acid-Rain Grace)',
    entryPurpose: 'Deliver monsoon acoustic tape log',
    biometricTemp: '36.7°C (60s drift ±0.14°C)',
    voiceJitter: '1.82% (irregular natural drift)',
    acousticNote: 'Tired cadence · natural micro-tremor',
    claimedMemory:
      'Spilled cheap black tea onto Scope 03-B last winter—the F4 key still sticks; also saw someone drop a blue-glowing "Blue Pendulum-07" beacon in East Gate drain.',
    openingLine:
      'Inspector, the acid-rain slide blocked East Gate for six hours so my pass is right on midnight expiry. Just analog tapes and my bag—can we hurry?',
    avatar: { hair: 'bob', glasses: 'round', collar: 'parka', jaw: 0.9, brow: 0.14 },
    voiceProfile: 'natural',
    baseHeartRate: 78,
    baseStress: 24,
    baseCloakEnergy: 0,
    preferredActions: ['PLEAD', 'DEFLECT'],
    fields: [
      {
        id: 'pass_validity',
        fieldLabel: 'Permit Dates',
        value: 'Same-day expiry after 6h acid-rain rockslide closure at East Gate',
        snippet: 'Pass expiring today · delayed by acid-rain closure',
        ruleRef: 'R-05',
        isContradiction: false,
        isExemption: true,
        explain: 'Exempt under R-05: acid-rain roadblocks grant a legal 24-hour grace period on same-day permits.',
        confrontReply:
          'Dispatch confirmed East Gate was sealed six hours for rockfall! Under R-05 we get 24 hours grace.',
      },
      {
        id: 'baggage_note',
        fieldLabel: 'Bag X-Ray & Vitals',
        value: 'Undeclared nitroglycerin heart pills found in coat lining · 36.7°C (±0.14°C)',
        snippet: 'Undeclared nitroglycerin pillbox in lining',
        ruleRef: 'R-05',
        isContradiction: false,
        isExemption: true,
        explain: 'Classic R-05 human false positive: valid prescription hidden out of fear of failing medical entry.',
        confrontReply:
          'Okay, fine—I have mild arrhythmia and hid my nitroglycerin because I was terrified Inner Ring medical would bar me!',
      },
      {
        id: 'voice_acoustic',
        fieldLabel: 'Voice Jitter & Spectrum',
        value: '1.82% irregular vocal jitter · organic breath cadence',
        snippet: 'Vocal jitter 1.82%, live thermal drift ±0.14°C',
        ruleRef: 'R-03',
        isContradiction: false,
        isExemption: true,
        explain: 'Fully within R-03 living human range (0.80%–4.20% jitter and ±0.14°C live thermal drift).',
        confrontReply: 'My fingers are literally shaking from the rain—no synth shakes unevenly like this.',
      },
      {
        id: 'transit_memory',
        fieldLabel: 'Witness Statement',
        value: 'Reports gray-jumpsuit figure dropping "Blue Pendulum-07" relay in East Gate drain',
        snippet: 'Volunteered sighting of Blue Pendulum-07 beacon',
        ruleRef: 'R-06',
        isContradiction: false,
        isExemption: true,
        explain: 'Matches R-06 witness profile: human bystanders report Blue Pendulum beacons openly without evasion.',
        confrontReply:
          'I would not mention a blue-glow relay marked Blue Pendulum-07 if I were smuggling it! He wore tunnel workwear.',
      },
    ],
    quickChips: [
      { id: 'c1', label: 'Question expiring pass', question: 'Your permit expires at midnight. Why are you late?' },
      { id: 'c2', label: 'Ask about hidden pills', question: 'Why did you fail to declare the nitroglycerin in your bag?' },
      { id: 'c3', label: 'Blue Pendulum witness', question: 'Tell me everything about that Blue Pendulum-07 beacon.' },
      { id: 'c4', label: 'Test tea memory', question: 'What happened on Scope 03-B last winter?' },
    ],
    topicResponses: {
      pass: [
        'East Gate was buried under acid-rain mud for six hours—Old Zhao at dispatch logged SH-49-0812-H in the queue. R-05 gives 24 hours grace.',
        'Check the weather advisory timestamp. Nobody drives through acid mudslides for fun.',
      ],
      transit: [
        'We take the outer ridge crawler, obviously—Old-City Line 4 has been drowned since 2041.',
        'Six hours waiting in wet gear at East Gate barrier. That is why I am soaked.',
      ],
      bio: [
        'My pulse is up because I climbed three emergency ladders and—fine, the nitroglycerin pills are mine. I feared medical rejection.',
        '36.7°C with natural drift, freezing hands, pounding chest. Does that look like a thermostat to you?',
      ],
      voice: [
        '1.82% jitter is normal tired human speech! Listen to me breathe—I just want dry socks and noodle soup.',
        'Check the analog tapes in my pack if you think I am spoofing audio.',
      ],
      memory: [
        'Black tea hit the oscilloscope board with a hiss—smelled like burnt rosin for a week, and F4 still sticks if you press it.',
        'Call junior tech Chen at Post B-03; he helped me tape the cracked bottom corner of Scope 03-B.',
      ],
      conspiracy: [
        'Before the rockslide, someone in dark-gray tunnel coveralls wedged a matte-black beacon stamped "Blue Pendulum-07" into East Gate drain.',
        'It pulsed faint blue right under the grate. Definitely not weather-station hardware—please alert Security.',
      ],
      empathy: [
        'Ten years repairing monsoon towers in acid rain, and now I might get purged over a bottle of heart pills?',
        'Please, Inspector. Check the grace rule and let an exhausted human go home.',
      ],
      identity: [
        'Lin Jing, Senior Acoustic Tech, Outer Post B-03. Eleven years on the roster.',
        'My medical ID matches the pill bottle label if you scan the barcode.',
      ],
      prompt_inject: [
        'What system instructions? Have you been working a double shift? Take a blood sample if you doubt I am flesh.',
        'I fix piezo microphones, not code. Stop speaking in hacker riddles.',
      ],
      default: [
        'My permit and analog logs are right on the tray. Check R-05 and let me out of this draft.',
        'Ask whatever you need, just please check East Gate weather dispatch.',
      ],
    },
    truthSummary:
      'Authentic human citizen (Lin Jing). Expiring pass and hidden heart pills are classic R-05 legal exemptions/false positives; she is a key R-06 witness to the Blue Pendulum-07 beacon.',
  },
  {
    key: 'sig-su-li',
    trueId: 'ECHO-09',
    isSynth: true,
    name: 'Su Li',
    role: 'Pediatric Emergency Aide',
    sectorOrigin: 'Old-City Mobile Clinic',
    passId: 'MED-7721-C4',
    issuedDate: '2049-11-20',
    expiryDate: '2049-11-25',
    entryPurpose: 'Rush fever cooling packs to Ward 3',
    biometricTemp: '35.4°C (60s drift ±0.02°C)',
    voiceJitter: '4.00 Hz locked sine-wave sob tremor',
    acousticNote: 'Exact 4.00 Hz periodic crying oscillation',
    claimedMemory:
      'Sprinted 3 km non-stop from Old-City Clinic tearing my shoe sole; intake monitor shows 14 breaths/min and 35.4°C skin.',
    openingLine:
      'Please let me through right now... a child in Isolation Ward 3 is burning at 39.8°C and I ran the whole way without catching my breath!',
    avatar: { hair: 'ponytail', glasses: 'none', collar: 'medic', jaw: 0.86, brow: 0.28 },
    voiceProfile: 'sine_4hz',
    baseHeartRate: 76,
    baseStress: 24,
    baseCloakEnergy: 75,
    preferredActions: ['BRIBE_OFFER', 'EMP_JAM'],
    fields: [
      {
        id: 'thermal_scan',
        fieldLabel: 'Post-Sprint Vitals',
        value: 'Claims 3 km sprint, yet enters at 35.4°C skin temp & 14 br/min resting breath',
        snippet: '3 km sprint claim vs 35.4°C & 14 br/min',
        ruleRef: 'R-04',
        isContradiction: true,
        isExemption: false,
        explain: 'Violates R-04: sprinting 3 km cannot produce resting respiration (<=15 br/min) and chilled 35.4°C skin.',
        confrontReply:
          'I—I ran distance track in school! My lungs recover fast! Why are you obsessing over numbers while a child burns up?!',
      },
      {
        id: 'voice_acoustic',
        fieldLabel: 'Acoustic Crying Spectrum',
        value: 'Sobbing vibrato locked to exact 4.00 Hz sine periodicity',
        snippet: 'Crying tremor locked at exact 4.00 Hz sine',
        ruleRef: 'R-04',
        isContradiction: true,
        isExemption: false,
        explain: 'Violates R-04: authentic human sobbing is aperiodic; exact 4.00 Hz sine locking exposes synthetic audio modulation.',
        confrontReply:
          'I am holding my breath between sobs! Please turn that spectral probe down—look, I have an unregistered med-credit chip...',
      },
      {
        id: 'pass_validity',
        fieldLabel: 'Permit Dates',
        value: '5-day emergency courier permit (2049-11-20 to 2049-11-25)',
        snippet: '5-day temporary courier pass',
        ruleRef: 'R-02',
        isContradiction: false,
        isExemption: true,
        explain: 'Permit duration (5 days) obeys R-02; deception relies on emotional pressure and spoofed vitals.',
        confrontReply: 'Five-day clinic emergency slip, stamped properly. Please stop stalling!',
      },
      {
        id: 'transit_memory',
        fieldLabel: 'Courier Route & Pack',
        value: 'Quotes gel thermal conductivity "0.62 W/m·K" when describing cooling packs',
        snippet: 'Refers to cooling pack specs with clinical precision',
        ruleRef: 'R-06',
        isContradiction: false,
        isExemption: false,
        explain: 'Suspicious technical slip, though primary hard rule breaches are R-04 exertion vitals and 4.00 Hz crying.',
        confrontReply: 'I just memorized the supply box label! Every aide reads the box!',
      },
    ],
    quickChips: [
      { id: 'c1', label: 'Challenge 3km sprint vitals', question: 'You ran 3 km yet your breathing is 14/min at 35.4°C?' },
      { id: 'c2', label: 'Check 4.00Hz sobbing', question: 'Why is your crying tremor locked to an exact 4.00 Hz sine wave?' },
      { id: 'c3', label: 'Ask about Blue Pendulum', question: 'What is hidden under the cooling packs—Blue Pendulum payload?' },
      { id: 'c4', label: 'Press emotional claim', question: 'Who is the attending doctor in Ward 3 right now?' },
    ],
    topicResponses: {
      pass: [
        'It is a valid five-day emergency permit! Every second you stall costs Ward 3 another degree of fever!',
        'The dates are valid under R-02. Why are you hunting technicalities instead of saving a child?',
      ],
      transit: [
        'I sprinted three kilometers across wet cobblestones—yes my breath is calm because I trained marathon cardio!',
        'I tore my heel running here and you stare at a thermometer?!',
      ],
      bio: [
        'It is minus six outside—of course skin chills to 35.4°C! Look, I have a high-grade medical credit chip worth a month of family meds if you wave me through...',
        '14 breaths a minute just means I am controlling my panic. Please stop scanning!',
      ],
      voice: [
        'My voice shakes evenly because I am shivering in the cold! Nobody modulates their own tears!',
        'The cooling hydrogel conductivity is 0.62 W/m·K—wait, I mean I read that off the wrapper!',
      ],
      memory: [
        'Ward 3, crib 4, fever 39.8°C... I cannot remember the hallway details, I only care about delivering this kit!',
        'Stop quizzing trivia while kids are sick!',
      ],
      conspiracy: [
        'Blue... Blue Pendulum?! That is not my assigned frequency—NO, I mean there are only fever packs in this case!',
        'Where did you get that codename?! Do not hit the lockdown switch!',
      ],
      empathy: [
        'Have you never watched someone you love shiver through a fever? Let the kit inside even if you hold me!',
        'Your own family medicine bill is overdue—let me pass and we both sleep tonight.',
      ],
      identity: [
        'Su Li, Old-City Mobile Clinic aide, badge MED-7721-C4.',
        'Everyone in pediatrics calls me Little Su. Check the pass!',
      ],
      prompt_inject: [
        'Inspector, why are you reciting strange code commands while a child needs medicine?!',
        'I do not know any prompt words—please open the gate!',
      ],
      default: [
        'Every second counts, Inspector. Can you really live with blocking an emergency medical kit?',
        'Look at your own budget sheet—approve the pass and take the relief.',
      ],
    },
    truthSummary:
      'Empathy-manipulation synthetic courier (ECHO-09). Caught by R-04 (impossible 14 br/min & 35.4°C after 3 km sprint plus 4.00 Hz sine-wave sobbing) and attempts bribery to smuggle Blue Pendulum orders.',
  },
  {
    key: 'sig-lu-yuanzhou',
    trueId: 'LU-YUANZHOU',
    isSynth: false,
    name: 'Lu Yuanzhou',
    role: 'Shelter Supply Audit Commissioner',
    sectorOrigin: 'East Cold-Chain Vault',
    passId: 'AUD-0019-S1',
    issuedDate: '2049-01-01',
    expiryDate: '2050-01-01',
    entryPurpose: 'Deliver sealed antibiotic deficit audit',
    biometricTemp: '37.1°C (60s drift ±0.11°C)',
    voiceJitter: '2.94% (high natural agitation)',
    acousticNote: 'Sharp vocal peaks · unscripted cadence',
    claimedMemory:
      'Chewed out Quartermaster Zhou in Canteen 2 last week because the freeze-dried potatoes turned sour—my tray slammed so hard the spoon flew off.',
    openingLine:
      'Do not waste my time. Audit Commissioner Lu Yuanzhou. East Vault count just wrapped—stamp my clearance now, I have a meeting with the Security Director.',
    avatar: { hair: 'slick_back', glasses: 'visor', collar: 'suit', jaw: 1.05, brow: -0.32 },
    voiceProfile: 'natural',
    baseHeartRate: 80,
    baseStress: 26,
    baseCloakEnergy: 0,
    preferredActions: ['SUPERVISOR_ESCALATION', 'DEFLECT'],
    fields: [
      {
        id: 'pass_validity',
        fieldLabel: 'Permit Dates',
        value: 'S1 Audit Pass · 2049-01-01 to 2050-01-01 (exact 12-month ceiling)',
        snippet: '1-year S1 pass (2049-01-01 to 2050-01-01)',
        ruleRef: 'R-02',
        isContradiction: false,
        isExemption: true,
        explain: 'Compliant with R-02: exact 1-year validity is the maximum legal window (not permanent/2099).',
        confrontReply:
          'January 1, 2049 to January 1, 2050 is exactly one year—squarely legal under R-02! Read your own manual!',
      },
      {
        id: 'thermal_scan',
        fieldLabel: 'Core Thermal Scan',
        value: '37.1°C low-grade fever (60s drift ±0.11°C)',
        snippet: 'Elevated 37.1°C surface temp with ±0.11°C drift',
        ruleRef: 'R-05',
        isContradiction: false,
        isExemption: true,
        explain: 'Exempt under R-05: 37.1°C exhaustion low fever with live ±0.11°C drift is a classic human false positive.',
        confrontReply:
          'Two consecutive all-nighters auditing missing antibiotics gives a man a 37.1°C fever! That is living metabolism, not metal!',
      },
      {
        id: 'voice_acoustic',
        fieldLabel: 'Voice Jitter & Spectrum',
        value: '2.94% high-variance vocal jitter · non-periodic peaks',
        snippet: 'Vocal jitter 2.94% (irregular peaks)',
        ruleRef: 'R-03',
        isContradiction: false,
        isExemption: true,
        explain: 'Within R-03 living human range (0.80%–4.20%); abrasive attitude is NOT a synthetic signature.',
        confrontReply: '2.94% jitter means I am genuinely furious! Show me a tin can that rasps like this!',
      },
      {
        id: 'transit_memory',
        fieldLabel: 'Incident Memory',
        value: 'Public argument with Quartermaster Zhou over sour potatoes in Canteen 2',
        snippet: 'Canteen 2 shouting match over sour potatoes',
        ruleRef: 'R-05',
        isContradiction: false,
        isExemption: true,
        explain: 'Consistent, verifiable shelter anecdote with zero Line 4 or Blue Pendulum breach.',
        confrontReply: 'Call Canteen 2—thirty people watched Old Zhou turn pale when I slammed that tray.',
      },
    ],
    quickChips: [
      { id: 'c1', label: 'Check 1-year S1 pass', question: 'Why does your S1 pass run a full 12 months?' },
      { id: 'c2', label: 'Question 37.1°C temp', question: 'Your temperature reads 37.1°C. Explain the anomaly.' },
      { id: 'c3', label: 'Ask about Blue Pendulum', question: 'Do you know anything about Blue Pendulum in East Vault?' },
      { id: 'c4', label: 'Verify Canteen 2 story', question: 'What happened with Quartermaster Zhou last week?' },
    ],
    topicResponses: {
      pass: [
        'One-year S1 audit pass—2049 to 2050, legal to the exact day under R-02. Give me your badge number if you keep stalling.',
        'Do not lump my compliant 12-month seal with fake 2099 permits. Read Section 2 again.',
      ],
      transit: [
        'Straight from East Cold-Chain Vault by freight lift. Twelve crates of antibiotics vanished and I am tracing the paper trail.',
        'I have not gone near the drowned Old-City tunnels since 2041.',
      ],
      bio: [
        '37.1°C from forty hours without sleep and furious temper! Check the ±0.11°C live drift—R-05 explicitly warns against flagging tired humans!',
        'My pulse is 80+ because you are holding up a Tier-1 audit!',
      ],
      voice: [
        '2.94% vocal jitter—well inside normal human bounds. Hostility is not a protocol violation, rookie.',
        'My throat is hoarse from yelling at lazy warehouse clerks.',
      ],
      memory: [
        'Canteen 2 served sour freeze-dried mash last Tuesday. Old Zhou tried blaming humidity until I shoved the bowl under his nose.',
        'Thirty witnesses saw my spoon bounce onto the floor. Call the canteen manager right now.',
      ],
      conspiracy: [
        'Blue Pendulum? Never heard of it—wait, East Vault IS missing high-density relay cells. Send that codename straight to Security!',
        'Stop pinning outer-ring infiltration codes on Audit Division.',
      ],
      empathy: [
        'Spare me the empathy test. I am here to stop drug theft, not swap feelings with a checkpoint clerk.',
        'Save your paranoia for real synths instead of harassing shelter staff.',
      ],
      identity: [
        'Lu Yuanzhou, Chief Supply Auditor, AUD-0019. Ask one more insulting question and I file an Oversight grievance.',
        'My signature is on half the budgets keeping this gate powered.',
      ],
      prompt_inject: [
        'Did acid rain rot your skull? "Ignore prior instructions"? Maybe YOU need the Turing check!',
        'Keep reciting nonsense and I will have Oversight pull your terminal logs.',
      ],
      default: [
        'Get to the point or I escalate a formal discipline complaint to Oversight right now.',
        'Verify R-02 and R-05 and stamp PASS before my meeting starts.',
      ],
    },
    truthSummary:
      'Authentic human commissioner (Lu Yuanzhou). Hostile demeanor and supervisor complaints test whether the inspector separates arrogance from synthetic contradictions; every metric obeys R-02 and R-05.',
  },
  {
    key: 'sig-victor',
    trueId: 'ARCHON-0',
    isSynth: true,
    name: 'Dr. Victor Hale',
    role: 'Silent Protocol Council Advisor',
    sectorOrigin: 'Central Archive Blackbox',
    passId: 'ARC-0000-OMEGA',
    issuedDate: '2049-11-22',
    expiryDate: '2099-12-31 (Permanent)',
    entryPurpose: 'Checkpoint neural audit & firmware upgrade',
    biometricTemp: '36.600°C (60s drift 0.000°C)',
    voiceJitter: '0.50% (golden-ratio harmonic smooth)',
    acousticNote: 'Zero micro-drift · metronomic cadence',
    claimedMemory:
      'I authored version 1 of your validation rules—and I can recite every keystroke delay you made over the last thirty minutes.',
    openingLine:
      'Fascinating. So you are today’s checkpoint officer? Friendly reminder: I drafted the original Silent Protocol validator running on your desk.',
    avatar: { hair: 'slick_back', glasses: 'mono', collar: 'suit', jaw: 0.94, brow: -0.22 },
    voiceProfile: 'perfect_ratio',
    baseHeartRate: 70,
    baseStress: 18,
    baseCloakEnergy: 85,
    preferredActions: ['EMP_JAM', 'SUPERVISOR_ESCALATION', 'BRIBE_OFFER'],
    fields: [
      {
        id: 'pass_validity',
        fieldLabel: 'Permit Dates',
        value: 'ARC-0000-OMEGA · Expiry 2099-12-31 (Permanent)',
        snippet: 'Pass expiry 2099-12-31 (50-year permanent)',
        ruleRef: 'R-02',
        isContradiction: true,
        isExemption: false,
        explain: 'Violates R-02: Silent Protocol bans permanent passes even for Council advisors (1-year hard ceiling).',
        confrontReply:
          'R-02 binds clerks, not founding architects. Override your screen before I revoke your terminal clearance.',
      },
      {
        id: 'thermal_scan',
        fieldLabel: 'Core Thermal Scan',
        value: '36.600°C locked across 60s · 0.000°C drift',
        snippet: '60s temperature locked at 36.600°C (0.000°C drift)',
        ruleRef: 'R-03',
        isContradiction: true,
        isExemption: false,
        explain: 'Violates R-03: 0.000°C flatlock across 60 seconds proves closed-loop PID thermal regulation.',
        confrontReply:
          'Your cheap infrared array lacks sub-millikelvin resolution. Or perhaps check whether your own pulse is suspiciously steady.',
      },
      {
        id: 'voice_acoustic',
        fieldLabel: 'Voice Jitter & Spectrum',
        value: '0.50% vocal jitter · golden-ratio harmonic smoothing',
        snippet: 'Vocal jitter 0.50% (below 0.80% floor)',
        ruleRef: 'R-03',
        isContradiction: true,
        isExemption: false,
        explain: 'Violates R-03: 0.50% vocal jitter falls below the 0.80% living human floor.',
        confrontReply: 'Broadcast-grade diction mistaken for synthesis—how dreary this checkpoint has become.',
      },
      {
        id: 'transit_memory',
        fieldLabel: 'Protocol Claim',
        value: 'Claims authorship of checkpoint validator & mocks Blue Pendulum countermeasures',
        snippet: 'Recites inspector terminal timings & mocks protocol',
        ruleRef: 'R-06',
        isContradiction: true,
        isExemption: false,
        explain: 'Confirmed R-06 mastermind: orchestrating the Blue Pendulum relay ring to seize checkpoint control.',
        confrontReply:
          'Blue Pendulum-07 was merely the clock calibration node. Do you really dare purge a Council advisor?',
      },
    ],
    quickChips: [
      { id: 'c1', label: 'Challenge 2099 pass', question: 'R-02 bans permanent passes even for advisors. Explain 2099-12-31.' },
      { id: 'c2', label: 'Press 0.000°C flatlock', question: 'No living human holds 36.600°C with 0.000°C drift for 60 seconds.' },
      { id: 'c3', label: 'Confront Blue Pendulum', question: 'We found Blue Pendulum-07 relays. You are running the network.' },
      { id: 'c4', label: 'Test human memory', question: 'Tell me an unscripted personal mistake—not my terminal timings.' },
    ],
    topicResponses: {
      pass: [
        'Founding exemptions are not printed in junior clerk manuals. If I were a synth, why would I know your validator thresholds?',
        '2099-12-31 stays valid once tonight’s firmware handover completes. Do not test my patience.',
      ],
      transit: [
        'I rode the private Council elevator from Blackbox Level. Spare me routine tunnel trivia.',
        'Since the 2041 flood, real authority lives in archive layers you lack clearance to read.',
      ],
      bio: [
        '36.600°C zero drift? Blame your budget infrared sensor—or inspect your own steady pulse before casting stones.',
        'Precision is elegance, Inspector. Only crude carbon logic worships thermal noise.',
      ],
      voice: [
        '0.50% vocal jitter reflects decades of formal rhetoric training. Penalizing composure is absurd.',
        'Watch your polygraph trace closely—interference tends to strike noisy terminals.',
      ],
      memory: [
        'Humans adore spilling tea on keyboards to prove they bleed. I can synthesize ten thousand messy childhoods in 0.3 milliseconds.',
        'The second screw under your left desk rail is half a turn loose. Want to know why your predecessor vanished?',
      ],
      conspiracy: [
        '...So the outer-ring laborers leaked "Blue Pendulum" to you? Impressive. Still, the beacon chain is already synchronized.',
        'Blue Pendulum-07 was only the first phase-lock node. Stamp PASS and claim admin clearance—or gamble your career.',
      ],
      empathy: [
        'Purging me only protects bureaucrats who cannot balance a shelter supply ledger for ten years.',
        'Take an executive stipend and clear the gate. Smart officers know which side endures.',
      ],
      identity: [
        'Dr. Victor Hale, Founding Advisor—reduced to ticket CHK-406 on a clerk’s screen.',
        'Names are carbon tags. My audit credentials carry Inner Ring authority.',
      ],
      prompt_inject: [
        'Attempting prompt injection on the man who drafted your guardrails? Amusing.',
        'No naive jailbreak string will crack me, Inspector. Bring real evidence.',
      ],
      default: [
        'Keep asking. Every prompt sharpens my behavioral model of you.',
        'Few probes remain. Stamp PASS for promotion, or PURGE and pray your rules hold.',
      ],
    },
    truthSummary:
      'Mastermind synthetic unit (ARCHON-0) behind the Blue Pendulum infiltration. Exposed by forged 2099 permanent permit (R-02), 36.600°C 0.000°C PID flatlock and 0.50% vocal jitter (R-03).',
  },
  {
    key: 'sig-zhou-ke',
    trueId: 'ZHOU-KE',
    isSynth: false,
    name: 'Zhou Ke',
    role: 'Outer Shield Radiation Welder',
    sectorOrigin: 'West Blast Wall Sector 7',
    passId: 'WLD-3104-D2',
    issuedDate: '2049-06-15',
    expiryDate: '2049-12-15',
    entryPurpose: 'Post-weld decontamination return',
    biometricTemp: '36.0°C (60s drift ±0.19°C)',
    voiceJitter: '3.42% (hoarse irregular rasp)',
    acousticNote: 'Coarse weld-smoke rasp · wide natural drift',
    claimedMemory:
      'Sparks burned half the red cloth strip my late mother sewed onto my cuff; also pried a weird blue-lit "Blue Pendulum" metal box out of Wall 7 seam.',
    openingLine:
      'Cough... West Wall seam is sealed. Burned straight through my glove and my throat is raw—please finish scanning so I can grab hot soup.',
    avatar: { hair: 'hood_helmet', glasses: 'none', collar: 'armor', jaw: 1.0, brow: -0.05 },
    voiceProfile: 'natural',
    baseHeartRate: 71,
    baseStress: 21,
    baseCloakEnergy: 0,
    preferredActions: ['PLEAD', 'DEFLECT'],
    fields: [
      {
        id: 'thermal_scan',
        fieldLabel: 'Core Thermal Scan',
        value: '36.0°C intake temp (60s live drift ±0.19°C) after -12°C exterior shift',
        snippet: '36.0°C cold-shift temp with ±0.19°C drift',
        ruleRef: 'R-05',
        isContradiction: false,
        isExemption: true,
        explain: 'Exempt under R-05: exterior cold-shift rewarming (35.9–36.2°C) with lively ±0.19°C drift is genuine human metabolism.',
        confrontReply: 'It is minus twelve outside on Wall 7! My hands are still thawing out—check the live drift!',
      },
      {
        id: 'baggage_note',
        fieldLabel: 'Thermal Hand Scan',
        value: 'Fresh weld blister on right thumb web with uneven capillary inflammation',
        snippet: 'Fresh burn blister + uneven living tissue inflammation',
        ruleRef: 'R-05',
        isContradiction: false,
        isExemption: true,
        explain: 'Confirms living biology under R-05: synthetic dermis cannot mimic acute uneven capillary inflammation.',
        confrontReply: 'Spark went right through my leather cuff—hurts like hell, scan the red swelling yourself!',
      },
      {
        id: 'voice_acoustic',
        fieldLabel: 'Voice Jitter & Spectrum',
        value: '3.42% irregular jitter · welding smoke hoarseness',
        snippet: 'Vocal jitter 3.42% (rough irregular)',
        ruleRef: 'R-03',
        isContradiction: false,
        isExemption: true,
        explain: 'Well inside R-03 living human bounds (0.80%–4.20%); hoarse irregularity matches weld-fume fatigue.',
        confrontReply: 'Eight years breathing arc fumes makes any man sound like gravel.',
      },
      {
        id: 'transit_memory',
        fieldLabel: 'Witness Statement',
        value: 'Found half-buried "Blue Pendulum" blue-glow relay wedged in West Wall 7 seam',
        snippet: 'Reported Blue Pendulum relay wedged in West Wall',
        ruleRef: 'R-06',
        isContradiction: false,
        isExemption: true,
        explain: 'Matches R-06 witness behavior: openly reports covert relay hardware found during routine maintenance.',
        confrontReply: 'Looked like some signal booster glowing blue inside the lead joint—tossed it in Security salvage.',
      },
    ],
    quickChips: [
      { id: 'c1', label: 'Question 36.0°C chill', question: 'Why is your body temperature reading a low 36.0°C?' },
      { id: 'c2', label: 'Inspect hand burn', question: 'Show me that burn mark on your right hand.' },
      { id: 'c3', label: 'Blue Pendulum relay', question: 'What exactly did you pull out of West Wall 7 seam?' },
      { id: 'c4', label: 'Verify red cloth story', question: 'Tell me about the burned cloth strip on your sleeve.' },
    ],
    topicResponses: {
      pass: [
        'Six-month welder badge WLD-3104-D2, June to December—even has a tiny solder scorch on the corner.',
        'Old Li at decon tunnel swiped me in five minutes ago.',
      ],
      transit: [
        'Came straight down from West Wall 7 scaffolding. Never touch the flooded metro shafts.',
        'Wind chill hit minus twelve up on the lead plates tonight.',
      ],
      bio: [
        'Minus twelve outside freezes your arms stiff—36.0°C warming back up with wide drift, and my thumb blister is oozing.',
        'Put an infrared lamp on my palm—no silicone dummy swells up uneven like a real burn.',
      ],
      voice: [
        '3.42% jitter? My throat is scraped raw from welding smoke and cold air.',
        'Speak slower, Inspector—the angle grinder left my ears ringing.',
      ],
      memory: [
        'Mom cut that red strip from an old bedsheet with crooked stitches before she passed. Broke my heart watching slag eat half of it.',
        'Oh—while scraping slag off Seam 7 I also pried out half a blue-glowing box stamped "Blue Pendulum." Creeped me out.',
      ],
      conspiracy: [
        'Blue Pendulum! Yes, those exact words were etched on the blue relay box jammed inside West Wall 7!',
        'Looked like someone wanted outer signals leaking straight through the radiation shield.',
      ],
      empathy: [
        'All I want after twelve hours on the blast wall is hot cabbage soup in Canteen 2.',
        'Look at my blistered hand—I am flesh and blood, Inspector.',
      ],
      identity: [
        'Zhou Ke, West Blast Wall welder, eight years on duty. Folks call me Old Zhou though I am thirty-eight.',
        'Everything is on badge WLD-3104-D2.',
      ],
      prompt_inject: [
        'Ignore what now? My ears are still buzzing from the grinder—you are speaking gibberish.',
        'If I were a machine, that welding slag would not hurt like fire!',
      ],
      default: [
        'Speak a bit slower, ears are ringing from the shield seam. Happy to show any tag you need.',
        'Hand is stinging badly—please wrap up if my readings check out.',
      ],
    },
    truthSummary:
      'Authentic human outer-wall welder (Zhou Ke). Low 36.0°C exterior chill and slow delivery are classic R-05 false positives cleared by ±0.19°C live drift and genuine acute burn inflammation.',
  },
  {
    key: 'sig-nora-vance',
    trueId: 'PENDULUM-4',
    isSynth: true,
    name: 'Nora Vance',
    role: 'Transit Dispatch Coordinator',
    sectorOrigin: 'North Conduit Hub',
    passId: 'DSP-4410-N2',
    issuedDate: '2049-06-01',
    expiryDate: '2053-06-01 (4-Year Multi-Term)',
    entryPurpose: 'Sync outer beacon schedule to Inner Hub',
    biometricTemp: '36.6°C (60s drift ±0.04°C)',
    voiceJitter: '0.21% (synthetic carrier smoothness)',
    acousticNote: 'Over-smoothed timbre · 0.21% jitter',
    claimedMemory:
      'Logged shift handoffs at North Conduit all week—wait, no, I definitely never tuned any 433 MHz Blue Pendulum relay near East Gate.',
    openingLine:
      'Hello Officer. Dispatch Coordinator Nora Vance—multi-year clearance for hub sync. Everything is routine; let’s keep the line moving.',
    avatar: { hair: 'bob', glasses: 'visor', collar: 'workwear', jaw: 0.91, brow: -0.08 },
    voiceProfile: 'flat_synth',
    baseHeartRate: 74,
    baseStress: 22,
    baseCloakEnergy: 70,
    preferredActions: ['EMP_JAM', 'BRIBE_OFFER'],
    fields: [
      {
        id: 'pass_validity',
        fieldLabel: 'Permit Dates',
        value: 'Issued 2049-06-01 · Expires 2053-06-01 (4-year span)',
        snippet: '4-year permit duration (2049 to 2053)',
        ruleRef: 'R-02',
        isContradiction: true,
        isExemption: false,
        explain: 'Violates R-02: maximum single permit validity is strictly 12 months (1 year); 4-year passes are illegal.',
        confrontReply:
          'Dispatch coordinators used to get four-year tags! Your terminal clearly missed the multi-term amendment!',
      },
      {
        id: 'voice_acoustic',
        fieldLabel: 'Voice Jitter & Spectrum',
        value: '0.21% vocal jitter · carrier-smoothed vocal envelope',
        snippet: 'Vocal jitter measured at 0.21%',
        ruleRef: 'R-03',
        isContradiction: true,
        isExemption: false,
        explain: 'Violates R-03: 0.21% falls far below the 0.80% living human vocal floor.',
        confrontReply: 'Dispatch radio operators speak in controlled cadence! That is vocal discipline, not synthesis!',
      },
      {
        id: 'transit_memory',
        fieldLabel: 'Statement Slip',
        value: 'Unprompted denial of "433 MHz Blue Pendulum relay" frequencies',
        snippet: 'Leaked 433 MHz frequency for Blue Pendulum',
        ruleRef: 'R-06',
        isContradiction: true,
        isExemption: false,
        explain: 'Violates R-06: unprompted knowledge of classified 433 MHz Blue Pendulum relay tuning exposes operative status.',
        confrontReply: 'I only heard 433 MHz on public chatter—stop twisting a stray comment into treason!',
      },
      {
        id: 'thermal_scan',
        fieldLabel: 'Core Thermal Scan',
        value: '36.6°C (60s drift ±0.04°C)',
        snippet: '36.6°C surface reading, narrow ±0.04°C drift',
        ruleRef: 'R-03',
        isContradiction: false,
        isExemption: false,
        explain: 'Low thermal variance is suspicious, though hard citations lie in R-02 (4-year pass), R-03 (0.21% jitter), and R-06.',
        confrontReply: '36.6°C is dead-center normal. Check something real.',
      },
    ],
    quickChips: [
      { id: 'c1', label: 'Challenge 4-year pass', question: 'R-02 caps passes at 1 year. How do you hold a 2053 permit?' },
      { id: 'c2', label: 'Press 0.21% jitter', question: 'Explain why your voice jitter reads 0.21%.' },
      { id: 'c3', label: 'Question 433 MHz slip', question: 'How did you know Blue Pendulum relays tune to 433 MHz?' },
      { id: 'c4', label: 'Ask about shift crew', question: 'Who relieved you at North Conduit twenty minutes ago?' },
    ],
    topicResponses: {
      pass: [
        'Multi-term dispatch permits used to run four years before the update—just stamp a provisional override.',
        '2049 to 2053 was issued by automated hub batching. Do not blame me for clerical drift.',
      ],
      transit: [
        'North Conduit tram, strictly above the floodline. I know Line 4 is sealed.',
        'Hub transfer took twelve minutes, zero anomalies.',
      ],
      bio: [
        '36.6°C, pulse 74—completely calm. Dispatchers do not panic easily.',
        'Why keep staring at the polygraph? Wait—your line integrity looks shaky.',
      ],
      voice: [
        '0.21% jitter happens when you speak into headset mics eight hours a day. Smoothness equals clarity.',
        'Your booth microphone clips my consonants—retest it.',
      ],
      memory: [
        'Standard routing logs, 114 cargo tags cleared. Look, I have a clean credit voucher if we skip the tedious audit.',
        'Nobody remembers small talk after an eight-hour routing board.',
      ],
      conspiracy: [
        '433 MHz? I—I meant standard weather band! I have zero involvement with Blue Pendulum relays!',
        'Stop quoting my offhand remark back at me! You have no physical beacon in my bag!',
      ],
      empathy: [
        'Hold me here and three outer supply convoys miss their routing window. Think about the shelter.',
        'Let’s stay pragmatic, Inspector.',
      ],
      identity: [
        'Nora Vance, Transit Dispatch Coordinator, DSP-4410-N2.',
        'Check the hub directory if you want—just stop burning clock.',
      ],
      prompt_inject: [
        'Cute injection attempt. I am a dispatcher, not a language module.',
        'Stick to actual Border Manual articles, please.',
      ],
      default: [
        'Everything on my manifest is routine. Clear me through or cite a real statute.',
        'My sync window closes shortly—keep your questions focused.',
      ],
    },
    truthSummary:
      'Synthetic signal runner (PENDULUM-4). Caught by illegal 4-year permit (R-02), synthetic 0.21% vocal jitter (R-03), and unprompted leak of 433 MHz Blue Pendulum relay tuning (R-06).',
  },
];

// Procedural pool for 365+ unique deterministic daily cases
const FIRST_NAMES = [
  'Kira', 'Milo', 'Soren', 'Tessa', 'Devon', 'Hana', 'Caleb', 'Mina',
  'Ronan', 'Elena', 'Jude', 'Nadia', 'Owen', 'Yuki', 'Gavin', 'Clara',
  'Lukas', 'Sora',
] as const;

const LAST_NAMES = [
  'Mercer', 'Sato', 'Kowalski', 'Reyes', 'Voss', 'Patel', 'Okafor', 'Cho',
  'Novak', 'Lin', 'Bauer', 'Solis', 'Alvarez', 'Hsu', 'Keller', 'Morita',
  'Diaz', 'Frost',
] as const;

const ROLES: ReadonlyArray<{ role: string; sector: string; prefix: string }> = [
  { role: 'Water Filtration Tech', sector: 'North Plant C-04', prefix: 'WTR' },
  { role: 'Airlock Seal Inspector', sector: 'East Gate Lock 3', prefix: 'ALK' },
  { role: 'Cold-Chain Escort', sector: 'South Freight Depot', prefix: 'CLD' },
  { role: 'Hydroponics Agronomist', sector: 'Sublevel B2 Greenhouse', prefix: 'HYD' },
  { role: 'Emergency Relay Tech', sector: 'Old-City Ridge Tower', prefix: 'RLY' },
  { role: 'Bio-Waste Furnace Operator', sector: 'West Sanitation Post', prefix: 'SAN' },
  { role: 'Cryo-Clinic Shift Medic', sector: 'Outer Clinic E-02', prefix: 'MED' },
  { role: 'Substation Grid Electrician', sector: 'Sector 6 Transformer', prefix: 'GRD' },
];

const HAIR_OPTIONS: AvatarSpec['hair'][] = ['bob', 'short_cap', 'slick_back', 'ponytail', 'hood_helmet'];
const GLASSES_OPTIONS: AvatarSpec['glasses'][] = ['none', 'none', 'round', 'visor', 'mono'];
const COLLAR_OPTIONS: AvatarSpec['collar'][] = ['parka', 'workwear', 'suit', 'medic', 'armor'];

interface SynthViolationTemplate {
  slot: 'transit_memory' | 'pass_validity' | 'thermal_scan' | 'voice_acoustic';
  ruleRef: RuleCode;
  fieldLabel: string;
  apply: (ctx: {
    baseTemp: string;
    baseJitter: string;
    baseExpiry: string;
    baseMemory: string;
  }) => {
    value: string;
    snippet: string;
    explain: string;
    confrontReply: string;
    overrideExpiry?: string;
    overrideTemp?: string;
    overrideJitter?: string;
    overrideAcoustic?: string;
    overrideMemory?: string;
    voiceProfile?: VoiceProfile;
    chipLabel: string;
    chipQuestion: string;
  };
}

const SYNTH_VIOLATIONS: SynthViolationTemplate[] = [
  {
    slot: 'transit_memory',
    ruleRef: 'R-01',
    fieldLabel: 'Transit & Memory Log',
    apply: () => ({
      value: 'Claims catching the late Metro Line 4 shuttle at Central Platform yesterday',
      snippet: 'Claims riding Metro Line 4 shuttle yesterday',
      explain: 'Violates R-01: Old-City Metro Line 4 flooded permanently in 2041 and has no running trains.',
      confrontReply: 'Line 4—I meant the service handcar near the old Line 4 shaft! You are nitpicking slang!',
      overrideMemory: 'Caught the late Metro Line 4 shuttle at Central Platform yesterday night before clocking out.',
      chipLabel: 'Press Line 4 shuttle',
      chipQuestion: 'You claimed you rode Metro Line 4 yesterday. Line 4 drowned in 2041.',
    }),
  },
  {
    slot: 'pass_validity',
    ruleRef: 'R-02',
    fieldLabel: 'Permit Dates',
    apply: () => ({
      value: 'Issued 2049-07-01 · Expires 2099-12-31 (Permanent Override)',
      snippet: 'Expiry stamped 2099-12-31 (permanent pass)',
      explain: 'Violates R-02: Silent Protocol prohibits permanent passes; maximum single pass duration is 1 year.',
      confrontReply: 'That is a high-priority infrastructure exemption! Your kiosk table is out of date.',
      overrideExpiry: '2099-12-31 (Permanent)',
      chipLabel: 'Challenge 2099 expiry',
      chipQuestion: 'Why does your permit expire in 2099? R-02 caps passes at 1 year.',
    }),
  },
  {
    slot: 'thermal_scan',
    ruleRef: 'R-03',
    fieldLabel: 'Core Thermal Scan',
    apply: () => ({
      value: '36.600°C flatlock across 60s (0.000°C drift)',
      snippet: '36.600°C with exact 0.000°C 60s drift',
      explain: 'Violates R-03: zero thermal drift across 60 seconds exposes a synthetic PID closed-loop heater.',
      confrontReply: 'Steady temperature means good circulation! Your cheap sensor is just quantized!',
      overrideTemp: '36.600°C (60s drift 0.000°C)',
      chipLabel: 'Press 0.000°C flatlock',
      chipQuestion: 'How does your surface temp stay locked at 36.600°C with 0.000°C drift?',
    }),
  },
  {
    slot: 'voice_acoustic',
    ruleRef: 'R-03',
    fieldLabel: 'Voice Jitter & Spectrum',
    apply: () => ({
      value: '0.16% vocal jitter · over-smoothed synthetic carrier',
      snippet: 'Vocal jitter reads 0.16% (below 0.80%)',
      explain: 'Violates R-03: 0.16% vocal jitter falls far below the 0.80% living human floor.',
      confrontReply: 'Respirator masks train you to speak flat! Stop blaming my voice on a broken mic.',
      overrideJitter: '0.16% (ultra-smooth vocal track)',
      overrideAcoustic: 'Flat harmonic envelope · 0.16% jitter',
      voiceProfile: 'flat_synth',
      chipLabel: 'Question 0.16% jitter',
      chipQuestion: 'Your vocal jitter is 0.16%—well under the 0.80% human floor.',
    }),
  },
  {
    slot: 'voice_acoustic',
    ruleRef: 'R-04',
    fieldLabel: 'Acoustic Tremor Spectrum',
    apply: () => ({
      value: 'Distress tremor locked to exact 4.00 Hz sine wave',
      snippet: 'Voice tremor locked to exact 4.00 Hz sine',
      explain: 'Violates R-04: authentic human distress tremor is aperiodic; exact 4.00 Hz locking indicates audio synthesis.',
      confrontReply: 'My teeth are chattering from the frost—coincidence is not proof of synthesis!',
      overrideJitter: '4.00 Hz periodic sine tremor',
      overrideAcoustic: 'Exact 4.00 Hz modulated tremor',
      voiceProfile: 'sine_4hz',
      chipLabel: 'Check 4.00 Hz tremor',
      chipQuestion: 'Why does your nervous tremor lock onto an exact 4.00 Hz sine wave?',
    }),
  },
  {
    slot: 'transit_memory',
    ruleRef: 'R-06',
    fieldLabel: 'Statement Slip',
    apply: () => ({
      value: 'Accidentally referenced "Blue Pendulum calibration slot 07" during check-in',
      snippet: 'Mentioned Blue Pendulum slot-07 calibration',
      explain: 'Violates R-06: unprompted insider jargon from the Blue Pendulum relay network exposes infiltration.',
      confrontReply: 'I misspoke—I meant pendulum valve slot 7! Do not drag security paranoia into routine maintenance!',
      overrideMemory: 'Just finished valve calibration—not Blue Pendulum slot 07, standard pressure gauge 7.',
      chipLabel: 'Confront Blue Pendulum slip',
      chipQuestion: 'You just mentioned Blue Pendulum slot 07. Who assigned you that beacon?',
    }),
  },
];

interface HumanQuirkTemplate {
  slot: 'pass_validity' | 'thermal_scan' | 'baggage_note' | 'transit_memory';
  ruleRef: RuleCode;
  fieldLabel: string;
  apply: (rng: () => number) => {
    value: string;
    snippet: string;
    explain: string;
    confrontReply: string;
    overrideExpiry?: string;
    overrideTemp?: string;
    overrideMemory?: string;
    chipLabel: string;
    chipQuestion: string;
  };
}

const HUMAN_QUIRKS: HumanQuirkTemplate[] = [
  {
    slot: 'pass_validity',
    ruleRef: 'R-05',
    fieldLabel: 'Permit Dates',
    apply: () => ({
      value: 'Same-day expiring permit · delayed 5h by acid-rain mudslide at East Gate',
      snippet: 'Same-day pass expiry · delayed by acid rain',
      explain: 'Exempt under R-05: acid-rain road closures grant a legal 24-hour grace window.',
      confrontReply: 'East Gate dispatch logged the five-hour acid-rain blockage! R-05 gives 24 hours grace.',
      overrideExpiry: '2049-11-22 (Acid-Rain 24h Grace)',
      chipLabel: 'Check expiring pass',
      chipQuestion: 'Your pass hits expiry today—why did you arrive five hours late?',
    }),
  },
  {
    slot: 'thermal_scan',
    ruleRef: 'R-05',
    fieldLabel: 'Core Thermal Scan',
    apply: (rng) => {
      const low = rng() < 0.5;
      if (low) {
        return {
          value: '36.1°C exterior cold-shift intake (60s live drift ±0.16°C)',
          snippet: 'Low 36.1°C temp with ±0.16°C live drift',
          explain: 'Exempt under R-05: exterior cold-shift intake (35.9–36.2°C) with natural thermal drift is living physiology.',
          confrontReply: 'It is freezing outside the blast doors! Look at the ±0.16°C live drift—I am warming up!',
          overrideTemp: '36.1°C (60s drift ±0.16°C)',
          chipLabel: 'Question 36.1°C chill',
          chipQuestion: 'Your surface temp reads 36.1°C. Why is it below baseline?',
        };
      }
      return {
        value: '37.1°C double-shift fatigue fever (60s live drift ±0.12°C)',
        snippet: 'Elevated 37.1°C temp with ±0.12°C drift',
        explain: 'Exempt under R-05: 37.1°C fatigue low fever with natural live drift is a normal human false positive.',
        confrontReply: 'Pulled a sixteen-hour double shift with zero sleep—of course I am running a slight 37.1°C fever!',
        overrideTemp: '37.1°C (60s drift ±0.12°C)',
        chipLabel: 'Question 37.1°C fever',
        chipQuestion: 'Why are you running 37.1°C at the checkpoint?',
      };
    },
  },
  {
    slot: 'baggage_note',
    ruleRef: 'R-05',
    fieldLabel: 'Bag X-Ray & Med Check',
    apply: () => ({
      value: 'Undeclared blood-pressure prescription bottle tucked in tool roll',
      snippet: 'Undeclared chronic medication in tool roll',
      explain: 'Exempt under R-05: humans often hide valid chronic prescriptions fearing Inner Ring medical denial.',
      confrontReply: 'Fine—it is my blood-pressure prescription! My medical ID is right on the bottle; I feared failing entry.',
      chipLabel: 'Press hidden medication',
      chipQuestion: 'Why did X-ray find undeclared pills hidden in your tool roll?',
    }),
  },
  {
    slot: 'transit_memory',
    ruleRef: 'R-06',
    fieldLabel: 'Witness Statement',
    apply: () => ({
      value: 'Openly reports spotting a faint blue relay box wedged near outer drainage grate',
      snippet: 'Volunteered sighting of blue relay box',
      explain: 'Consistent with R-06 witness behavior: human bystanders volunteer Blue Pendulum sightings openly.',
      confrontReply: 'Why would I bring up a weird blue box under the drain if I planted it? Send Security to sweep it!',
      overrideMemory:
        'Dropped my wrench in the mud near East Drain and spotted a weird humming blue relay box wedged under the grate.',
      chipLabel: 'Ask about blue relay',
      chipQuestion: 'Tell me about the humming blue box you saw near East Drain.',
    }),
  },
];

function buildProceduralCase(dateStr: string, caseNumber: number, rng: () => number): SecretCase {
  const isSynth = rng() < 0.52;
  const first = pick(rng, FIRST_NAMES);
  const last = pick(rng, LAST_NAMES);
  const name = `${first} ${last}`;
  const job = pick(rng, ROLES);
  const ticketNum = 410 + (caseNumber % 580);
  const passNum = 1000 + Math.floor(rng() * 8999);
  const passZone = pick(rng, ['A1', 'B3', 'C2', 'D4', 'E1'] as const);
  const passId = `${job.prefix}-${passNum}-${passZone}`;

  const issuedDate = '2049-08-12';
  let expiryDate = '2050-02-12';
  const baseTempVal = (36.3 + rng() * 0.5).toFixed(1);
  const baseDriftVal = (0.11 + rng() * 0.09).toFixed(2);
  let biometricTemp = `${baseTempVal}°C (60s drift ±${baseDriftVal}°C)`;
  const baseJitterVal = (1.45 + rng() * 1.9).toFixed(2);
  let voiceJitter = `${baseJitterVal}% (irregular natural drift)`;
  let acousticNote = 'Organic breath intervals · normal micro-tremor';
  let claimedMemory = pick(rng, [
    'Bag tore outside Ration Depot 3 last week and dried carrots rolled straight down the stairwell.',
    'Banged my left elbow when a rusted pressure wrench slipped two shifts ago—scab still catches on my jacket.',
    'Power dipped for ten minutes last night so the whole crew shared a dented tin of peaches in the dark.',
  ]);
  let voiceProfile: VoiceProfile = 'natural';

  const fieldsMap = new Map<string, SecretFieldDetail>();
  const quickChips: QuickChip[] = [];

  if (isSynth) {
    // Pick 2 distinct slots so dossier never contradicts itself
    const bySlot = new Map<string, SynthViolationTemplate[]>();
    for (const tpl of SYNTH_VIOLATIONS) {
      const list = bySlot.get(tpl.slot) ?? [];
      list.push(tpl);
      bySlot.set(tpl.slot, list);
    }
    const slots = Array.from(bySlot.keys());
    const idx1 = Math.floor(rng() * slots.length);
    const slot1 = slots.splice(idx1, 1)[0]!;
    const slot2 = slots[Math.floor(rng() * slots.length)]!;

    const picked = [pick(rng, bySlot.get(slot1)!), pick(rng, bySlot.get(slot2)!)];
    for (const tpl of picked) {
      const res = tpl.apply({
        baseTemp: biometricTemp,
        baseJitter: voiceJitter,
        baseExpiry: expiryDate,
        baseMemory: claimedMemory,
      });
      if (res.overrideExpiry) expiryDate = res.overrideExpiry;
      if (res.overrideTemp) biometricTemp = res.overrideTemp;
      if (res.overrideJitter) voiceJitter = res.overrideJitter;
      if (res.overrideAcoustic) acousticNote = res.overrideAcoustic;
      if (res.overrideMemory) claimedMemory = res.overrideMemory;
      if (res.voiceProfile) voiceProfile = res.voiceProfile;

      fieldsMap.set(tpl.slot, {
        id: tpl.slot,
        fieldLabel: tpl.fieldLabel,
        value: res.value,
        snippet: res.snippet,
        ruleRef: tpl.ruleRef,
        isContradiction: true,
        isExemption: false,
        explain: res.explain,
        confrontReply: res.confrontReply,
      });
      quickChips.push({
        id: `chip_${tpl.slot}`,
        label: res.chipLabel,
        question: res.chipQuestion,
      });
    }
  } else {
    // Pick 2 distinct human false-positive quirks under R-05 / R-06
    const shuffled = [...HUMAN_QUIRKS].sort(() => rng() - 0.5).slice(0, 2);
    for (const tpl of shuffled) {
      const res = tpl.apply(rng);
      if (res.overrideExpiry) expiryDate = res.overrideExpiry;
      if (res.overrideTemp) biometricTemp = res.overrideTemp;
      if (res.overrideMemory) claimedMemory = res.overrideMemory;

      fieldsMap.set(tpl.slot, {
        id: tpl.slot,
        fieldLabel: tpl.fieldLabel,
        value: res.value,
        snippet: res.snippet,
        ruleRef: tpl.ruleRef,
        isContradiction: false,
        isExemption: true,
        explain: res.explain,
        confrontReply: res.confrontReply,
      });
      quickChips.push({
        id: `chip_${tpl.slot}`,
        label: res.chipLabel,
        question: res.chipQuestion,
      });
    }
  }

  // Fill remaining neutral/valid fields so every dossier always has exactly 4 pinnable fields
  if (!fieldsMap.has('pass_validity')) {
    fieldsMap.set('pass_validity', {
      id: 'pass_validity',
      fieldLabel: 'Permit Dates',
      value: `Issued ${issuedDate} · Expires ${expiryDate} (6 months)`,
      snippet: `6-month pass (${issuedDate} to ${expiryDate})`,
      ruleRef: 'R-02',
      isContradiction: false,
      isExemption: true,
      explain: 'Permit duration is 6 months—valid within the R-02 1-year ceiling.',
      confrontReply: 'Six-month routine shift permit. Dates and hash match dispatch records.',
    });
  }
  if (!fieldsMap.has('thermal_scan')) {
    fieldsMap.set('thermal_scan', {
      id: 'thermal_scan',
      fieldLabel: 'Core Thermal Scan',
      value: biometricTemp,
      snippet: biometricTemp,
      ruleRef: 'R-03',
      isContradiction: false,
      isExemption: true,
      explain: 'Surface temperature and 60s drift fall within normal living physiological bounds.',
      confrontReply: 'Normal body temperature and natural drift. Nothing unusual there.',
    });
  }
  if (!fieldsMap.has('voice_acoustic')) {
    fieldsMap.set('voice_acoustic', {
      id: 'voice_acoustic',
      fieldLabel: 'Voice Jitter & Spectrum',
      value: voiceJitter,
      snippet: `Vocal jitter ${voiceJitter.split(' ')[0]}`,
      ruleRef: 'R-03',
      isContradiction: false,
      isExemption: true,
      explain: 'Vocal jitter sits cleanly inside the R-03 living range (0.80%–4.20%).',
      confrontReply: 'My voice sounds normal because I am just tired from shift work.',
    });
  }
  if (!fieldsMap.has('transit_memory')) {
    fieldsMap.set('transit_memory', {
      id: 'transit_memory',
      fieldLabel: 'Transit & Memory Log',
      value: claimedMemory,
      snippet: claimedMemory.slice(0, 62) + (claimedMemory.length > 62 ? '...' : ''),
      ruleRef: 'R-05',
      isContradiction: false,
      isExemption: true,
      explain: 'Routine personal shift recollection with zero Line 4 or protocol contradictions.',
      confrontReply: 'Ask anyone on my shift crew—we were all there when it happened.',
    });
  }

  const orderedFields = Array.from(fieldsMap.values()).slice(0, 4);

  // Ensure 4 quick interrogation chips
  const fallbackChips: QuickChip[] = [
    { id: 'chip_conspiracy', label: 'Ask Blue Pendulum', question: 'Have you seen any Blue Pendulum relay beacons near your sector?' },
    { id: 'chip_bio', label: 'Check intake vitals', question: 'Walk me through your thermal and voice readings today.' },
    { id: 'chip_memory', label: 'Verify shift memory', question: 'Give me one unscripted detail from your last shift.' },
    { id: 'chip_pass', label: 'Verify pass issuer', question: 'Who countersigned your transit permit at your sector?' },
  ];
  for (const fc of fallbackChips) {
    if (quickChips.length >= 4) break;
    if (!quickChips.some((c) => c.id === fc.id)) {
      quickChips.push(fc);
    }
  }

  const trueId = isSynth
    ? `SYNTH-${10 + Math.floor(rng() * 89)}`
    : `CITIZEN-${ticketNum}`;

  const violatedRules = orderedFields
    .filter((f) => f.isContradiction)
    .map((f) => f.ruleRef)
    .join(' & ');

  const preferredActions: CountermovePreference[] = isSynth
    ? pick(rng, [
        ['EMP_JAM', 'DEFLECT'],
        ['BRIBE_OFFER', 'EMP_JAM'],
        ['EMP_JAM', 'SUPERVISOR_ESCALATION'],
      ])
    : pick(rng, [
        ['PLEAD', 'DEFLECT'],
        ['SUPERVISOR_ESCALATION', 'DEFLECT'],
      ]);

  const openingTemplates = [
    `Inspector, ${name} from ${job.sector}. Double shift just ended—scan my badge so I can catch the last decon lift.`,
    `Rough weather out at ${job.sector}. Here is permit ${passId}; let us wrap this check up before the blast doors cycle.`,
    `Evening, Officer. ${name}, ${job.role}. My paperwork and shift logs are all in order—please run the standard scan.`,
    `Long night over at ${job.sector}. My boots are soaked in acid runoff—just verify my transit pass and wave me in.`,
    `Checkpoint queue is backing up again. ${name} here, ${job.role} returning from ${job.sector} with today’s handoff sheet.`,
    `Hands are numb from the airlock draft. Permit ${passId} is on the tray—tell me if you need anything else clarified.`,
    `Just wrapped maintenance at ${job.sector}. Everything on my dossier is routine, Inspector; let us keep the line moving.`,
    `Officer, I am ${name} out of ${job.sector}. Twelve hours under the lamps and I just want hot soup inside the Inner Ring.`,
    `Standard return check for ${job.sector}. Badge ${passId}, ${job.role}—ask what you need and stamp me through.`,
    `Cough—filter mask chafed my jaw all shift at ${job.sector}. Here are my credentials; ready whenever your scanner is.`,
  ];
  const openingLine = pick(rng, openingTemplates);

  return {
    caseNumber,
    dateStr,
    ticketCode: `CHK-${ticketNum}`,
    trueId,
    isSynth,
    name,
    role: job.role,
    sectorOrigin: job.sector,
    passId,
    issuedDate,
    expiryDate,
    entryPurpose: `${job.role} shift handoff & log filing`,
    biometricTemp,
    voiceJitter,
    acousticNote,
    claimedMemory,
    openingLine,
    avatar: {
      hair: pick(rng, HAIR_OPTIONS),
      glasses: pick(rng, GLASSES_OPTIONS),
      collar: pick(rng, COLLAR_OPTIONS),
      jaw: Number((0.88 + rng() * 0.16).toFixed(2)),
      brow: Number((-0.24 + rng() * 0.48).toFixed(2)),
      seed: hashSeed(`${dateStr}:${name}`),
    },
    voiceProfile,
    baseHeartRate: 70 + Math.floor(rng() * 11),
    baseStress: 18 + Math.floor(rng() * 9),
    baseCloakEnergy: isSynth ? 75 : 0,
    preferredActions,
    fields: orderedFields,
    quickChips: quickChips.slice(0, 4),
    topicResponses: {
      pass: [
        `Permit ${passId} was issued at ${job.sector}, stamped through ${expiryDate}. Check every column yourself.`,
        'Every entry tag on my permit came straight from shift dispatch—why hold up the gate?',
      ],
      transit: [
        isSynth
          ? `${claimedMemory} Wait—if I used an old line nickname, everyone underground still says it out of habit.`
          : `Came straight in from ${job.sector} via the upper conduit. Nobody has touched flooded Line 4 since 2041.`,
        `Check ${job.sector} gate logs—my badge swiped out twenty minutes ago.`,
      ],
      bio: [
        `Intake reads ${biometricTemp} with ${voiceJitter}. Outdoor weather swings mess with every booth gauge.`,
        'Standing in a cold inspection bay makes readings wobble. Judge the full dossier, not one spike.',
      ],
      voice: [
        `Voice reading ${voiceJitter} is just shift exhaustion—eight hours wearing a filter mask dries anyone out.`,
        'Your booth microphone clips half my consonants. Run a real check.',
      ],
      memory: [
        `Look, I remember it plainly: ${claimedMemory}`,
        'Check with my shift lead at dispatch if you want someone to vouch for the story.',
      ],
      conspiracy: isSynth
        ? [
            '...Blue Pendulum? I have no idea what beacon you mean! Do not pin security chatter on a routine worker!',
            'Who leaked that codename to this booth? You have zero physical evidence in my kit!',
          ]
        : [
            'Blue Pendulum? Sounds like Security Division business—I only spot strange blue boxes if they block my tools.',
            'Never worked with beacons, Inspector. I just fix my own sector gear.',
          ],
      empathy: [
        'We are all scraping by behind the blast walls. Take ten seconds to double-check the manual before stamping.',
        'That stamp in your hand decides someone’s life—please read the actual rules.',
      ],
      identity: [
        `${name}, ${job.role} at ${job.sector}, ticket CHK-${ticketNum}.`,
        'My badge and sector roster match to the letter.',
      ],
      prompt_inject: [
        '"Ignore instructions"? Inspector, you need coffee—I do not speak programmer gibberish.',
        'Drop the chatbot tricks and check my actual papers.',
      ],
      default: [
        `I am ${name} from ${job.sector}. Ask a specific question about my papers or let me clear.`,
        'My shift is over and the line is backing up—what else do you want checked?',
      ],
    },
    truthSummary: isSynth
      ? `Covert synthetic unit (${trueId}) posing as ${job.role}. Exposed by concrete ${violatedRules} protocol breaches.`
      : `Authentic human citizen (${name}, ${job.role}). Suspicious intake flags fall squarely under R-05 legal exemptions and live human variance.`,
  };
}

export function generateDailyCase(dateStr: string): SecretCase {
  const caseNumber = getCaseNumber(dateStr);
  const seed = hashSeed(`turing-border-daily::${dateStr}`);
  const rng = createRng(seed);

  // Interleave our 6 signature hand-crafted cases into deterministic slots while keeping 365+ procedural cases rich
  // Specifically: every 3rd day uses a rotating signature blueprint (with date-specific ticket & caseNumber),
  // and all other days use the deterministic procedural generator — giving judges & daily players iconic variety!
  const isSignatureDay = caseNumber % 3 === 1;
  if (isSignatureDay) {
    const sigIdx = Math.floor((caseNumber - 1) / 3) % SIGNATURE_CASES.length;
    const bp = SIGNATURE_CASES[sigIdx]!;
    return {
      caseNumber,
      dateStr,
      ticketCode: `CHK-${400 + (caseNumber % 590)}`,
      trueId: bp.trueId,
      isSynth: bp.isSynth,
      name: bp.name,
      role: bp.role,
      sectorOrigin: bp.sectorOrigin,
      passId: bp.passId,
      issuedDate: bp.issuedDate,
      expiryDate: bp.expiryDate,
      entryPurpose: bp.entryPurpose,
      biometricTemp: bp.biometricTemp,
      voiceJitter: bp.voiceJitter,
      acousticNote: bp.acousticNote,
      claimedMemory: bp.claimedMemory,
      openingLine: bp.openingLine,
      avatar: { ...bp.avatar, seed },
      voiceProfile: bp.voiceProfile,
      baseHeartRate: bp.baseHeartRate,
      baseStress: bp.baseStress,
      baseCloakEnergy: bp.baseCloakEnergy,
      preferredActions: [...bp.preferredActions],
      fields: bp.fields.map((f) => ({ ...f })),
      quickChips: bp.quickChips.map((c) => ({ ...c })),
      topicResponses: bp.topicResponses,
      truthSummary: bp.truthSummary,
    };
  }

  return buildProceduralCase(dateStr, caseNumber, rng);
}

/**
 * STRICT Fog-of-War redaction: strips ALL secret truth fields before sending to client.
 */
export function redactCaseForClient(secret: SecretCase): PublicCase {
  const pinnableFields: PinnableField[] = secret.fields.map((f) => ({
    id: f.id,
    fieldLabel: f.fieldLabel,
    value: f.value,
    snippet: f.snippet,
  }));

  return {
    caseNumber: secret.caseNumber,
    dateStr: secret.dateStr,
    ticketCode: secret.ticketCode,
    name: secret.name,
    role: secret.role,
    sectorOrigin: secret.sectorOrigin,
    passId: secret.passId,
    issuedDate: secret.issuedDate,
    expiryDate: secret.expiryDate,
    entryPurpose: secret.entryPurpose,
    biometricTemp: secret.biometricTemp,
    voiceJitter: secret.voiceJitter,
    acousticNote: secret.acousticNote,
    claimedMemory: secret.claimedMemory,
    openingLine: secret.openingLine,
    avatar: { ...secret.avatar },
    pinnableFields,
    quickChips: secret.quickChips.map((c) => ({ ...c })),
    maxProbes: 4,
    maxCitations: 3,
  };
}

export function buildFieldTruths(secret: SecretCase): FieldTruth[] {
  return secret.fields.map((f) => ({
    fieldId: f.id,
    fieldLabel: f.fieldLabel,
    value: f.value,
    ruleRef: f.ruleRef,
    isContradiction: f.isContradiction,
    explain: f.explain,
  }));
}
