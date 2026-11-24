import type { AvatarSpec } from '../../shared/types';

interface PassportPortraitProps {
  avatar: AvatarSpec;
  ticketCode: string;
  size?: 'sm' | 'md';
  jammed?: boolean;
}

export function PassportPortrait({
  avatar,
  ticketCode,
  size = 'md',
  jammed = false,
}: PassportPortraitProps) {
  const dims = size === 'sm' ? 'w-14 h-16' : 'w-16 h-20';
  const jawHalf = Math.round(14 * avatar.jaw);
  const browTilt = Math.round(avatar.brow * 6);
  const strokeMain = jammed ? '#92400e' : '#18181b';

  return (
    <div
      className={`${dims} shrink-0 border border-[#e6e8ec] rounded-[4px] bg-[#ffffff] relative overflow-hidden flex items-center justify-center`}
      aria-label={`Passport portrait ${ticketCode}`}
    >
      <svg
        viewBox="0 0 64 76"
        className="w-full h-full block"
        role="img"
        aria-hidden="true"
      >
        {/* Subtle registration grid */}
        <line x1="0" y1="20" x2="64" y2="20" stroke="#f0f1f4" strokeWidth="1" />
        <line x1="0" y1="40" x2="64" y2="40" stroke="#f0f1f4" strokeWidth="1" />
        <line x1="0" y1="60" x2="64" y2="60" stroke="#f0f1f4" strokeWidth="1" />
        <line x1="32" y1="0" x2="32" y2="76" stroke="#f0f1f4" strokeWidth="1" />

        {/* Corner registration ticks */}
        <path d="M4 9 V4 H9 M55 4 H60 V9 M4 67 V72 H9 M55 72 H60 V67" fill="none" stroke="#8b8d94" strokeWidth="1" />

        {/* Collar / Shoulders */}
        {avatar.collar === 'suit' && (
          <g>
            <path d="M10 76 L15 57 L32 62 L49 57 L54 76 Z" fill="#f7f8fa" stroke={strokeMain} strokeWidth="1.5" />
            <path d="M26 59 L32 70 L38 59" fill="none" stroke="#0f766e" strokeWidth="1.5" />
          </g>
        )}
        {avatar.collar === 'parka' && (
          <g>
            <path d="M8 76 L13 55 Q32 61 51 55 L56 76 Z" fill="#f7f8fa" stroke={strokeMain} strokeWidth="1.5" />
            <path d="M18 56 Q32 65 46 56" fill="none" stroke="#0f766e" strokeWidth="1.5" />
          </g>
        )}
        {avatar.collar === 'medic' && (
          <g>
            <path d="M10 76 L15 57 L49 57 L54 76 Z" fill="#ffffff" stroke={strokeMain} strokeWidth="1.5" />
            <path d="M29 66 H35 M32 63 V69" stroke="#0f766e" strokeWidth="1.7" />
          </g>
        )}
        {avatar.collar === 'armor' && (
          <g>
            <path d="M8 76 L12 56 L22 53 L42 53 L52 56 L56 76 Z" fill="#f3f4f6" stroke={strokeMain} strokeWidth="1.6" />
            <line x1="22" y1="53" x2="22" y2="76" stroke="#8b8d94" strokeWidth="1" />
            <line x1="42" y1="53" x2="42" y2="76" stroke="#8b8d94" strokeWidth="1" />
          </g>
        )}
        {avatar.collar === 'workwear' && (
          <g>
            <path d="M10 76 L15 56 L49 56 L54 76 Z" fill="#f7f8fa" stroke={strokeMain} strokeWidth="1.5" />
            <line x1="32" y1="58" x2="32" y2="76" stroke="#0f766e" strokeWidth="1.2" />
          </g>
        )}

        {/* Neck */}
        <rect x="27" y="48" width="10" height="10" fill="#ffffff" stroke={strokeMain} strokeWidth="1.4" />

        {/* Head silhouette */}
        <path
          d={`M${32 - jawHalf} 28 Q${32 - jawHalf} 14 32 14 Q${32 + jawHalf} 14 ${32 + jawHalf} 28 L${32 + Math.round(jawHalf * 0.88)} 41 Q32 52 ${32 - Math.round(jawHalf * 0.88)} 41 Z`}
          fill="#ffffff"
          stroke={strokeMain}
          strokeWidth="1.6"
        />

        {/* Hair styles */}
        {avatar.hair === 'bob' && (
          <path
            d="M16 32 Q16 12 32 11 Q48 12 48 32 L45 38 L44 24 Q32 19 20 24 L19 38 Z"
            fill="#18181b"
          />
        )}
        {avatar.hair === 'short_cap' && (
          <g>
            <path d="M17 24 Q19 11 32 11 Q45 11 47 24 Z" fill="#18181b" />
            <path d="M15 24 H49" stroke="#0f766e" strokeWidth="2" />
          </g>
        )}
        {avatar.hair === 'slick_back' && (
          <path d="M18 24 Q20 11 32 12 Q44 11 46 24 Q38 18 32 19 Q26 18 18 24 Z" fill="#18181b" />
        )}
        {avatar.hair === 'ponytail' && (
          <g>
            <path d="M18 26 Q19 11 32 12 Q45 11 46 26 Q38 19 32 20 Q26 19 18 26 Z" fill="#18181b" />
            <path d="M45 20 Q53 23 51 35" fill="none" stroke="#18181b" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        )}
        {avatar.hair === 'hood_helmet' && (
          <path
            d="M14 40 Q13 10 32 10 Q51 10 50 40"
            fill="none"
            stroke="#18181b"
            strokeWidth="2.4"
          />
        )}

        {/* Brows & Eyes */}
        <line x1="22" y1={28 + browTilt} x2="29" y2={28 - browTilt} stroke={strokeMain} strokeWidth="1.4" />
        <line x1="35" y1={28 - browTilt} x2="42" y2={28 + browTilt} stroke={strokeMain} strokeWidth="1.4" />
        <circle cx="25.5" cy="32" r="1.4" fill={strokeMain} />
        <circle cx="38.5" cy="32" r="1.4" fill={strokeMain} />

        {/* Glasses */}
        {avatar.glasses === 'round' && (
          <g fill="none" stroke="#0f766e" strokeWidth="1.2">
            <circle cx="25.5" cy="32" r="4.2" />
            <circle cx="38.5" cy="32" r="4.2" />
            <line x1="29.7" y1="32" x2="34.3" y2="32" />
          </g>
        )}
        {avatar.glasses === 'visor' && (
          <rect x="20" y="29" width="24" height="6" rx="1.5" fill="#f0fdfa" fillOpacity="0.6" stroke="#0f766e" strokeWidth="1.2" />
        )}
        {avatar.glasses === 'mono' && (
          <circle cx="38.5" cy="32" r="4.5" fill="none" stroke="#0f766e" strokeWidth="1.3" />
        )}

        {/* Nose & Mouth */}
        <line x1="32" y1="32" x2="32" y2="38" stroke="#8b8d94" strokeWidth="1.1" />
        <line x1="27" y1="42" x2="37" y2="42" stroke={strokeMain} strokeWidth="1.3" />

        {/* EMP Static overlay when jammed */}
        {jammed && (
          <g stroke="#92400e" strokeWidth="1" opacity="0.65">
            <line x1="6" y1="26" x2="58" y2="26" strokeDasharray="3 3" />
            <line x1="6" y1="39" x2="58" y2="39" strokeDasharray="5 2" />
            <line x1="6" y1="52" x2="58" y2="52" strokeDasharray="2 4" />
          </g>
        )}
      </svg>
    </div>
  );
}
