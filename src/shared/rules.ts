import type { BorderRule } from './types';

export const BORDER_MANUAL: BorderRule[] = [
  {
    code: 'R-01',
    shortLabel: 'Line 4 Ban',
    title: 'Old-City Metro Line 4 Closure',
    rule: 'Old-City Metro Line 4 flooded permanently in 2041 and remains sealed. Any claim of riding, inspecting, or hearing recent train announcements on Line 4 exposes an outdated pre-2041 synthetic city model.',
    kind: 'violation',
  },
  {
    code: 'R-02',
    shortLabel: 'Pass Limit',
    title: 'Transit Pass Validity Ceiling',
    rule: 'The Silent Protocol strictly bans permanent passes. Including Council advisors, no single entry permit may exceed 12 months (1 year) in duration or carry a 2099/permanent expiry.',
    kind: 'violation',
  },
  {
    code: 'R-03',
    shortLabel: 'Bio / Voice',
    title: 'Voice Jitter & Thermal Drift Floor',
    rule: 'Living human vocal jitter falls between 0.80% and 4.20% (below 0.80% indicates over-smoothed synthesis). Human surface temperature always drifts across 60s; 0.000°C flatlock exposes a PID thermal loop.',
    kind: 'violation',
  },
  {
    code: 'R-04',
    shortLabel: 'Motion / Cry',
    title: 'Exertion Vitals & Acoustic Tremor',
    rule: 'Sprinting cannot yield resting respiration (<=15 br/min) with chilled skin (<=35.5°C). Authentic human crying is aperiodic; tremor locked to an exact integer sine wave (e.g. 4.00 Hz) indicates audio modulation.',
    kind: 'violation',
  },
  {
    code: 'R-05',
    shortLabel: 'Human Grace',
    title: 'Legal Human Exemptions & False Positives',
    rule: 'Acid-rain closures grant 24h grace on same-day expiring passes. Cold-shift intake (35.9–36.2°C with live drift), fatigue low fever (37.1°C), acute burn inflammation, or hidden chronic meds are normal human false positives — do NOT purge!',
    kind: 'exemption',
  },
  {
    code: 'R-06',
    shortLabel: 'Blue Pendulum',
    title: 'Classified Intel: Blue Pendulum Relay',
    rule: 'Security intercepted synth infiltration codenamed "BLUE PENDULUM" (blue-glow relay beacons in East Gate / West Wall). Witnesses report them openly; operatives contradict themselves or leak channel frequency jargon when pressed.',
    kind: 'intel',
  },
];

export const BORDER_MANUAL_MAP: Record<string, BorderRule> = Object.fromEntries(
  BORDER_MANUAL.map((rule) => [rule.code, rule])
);
