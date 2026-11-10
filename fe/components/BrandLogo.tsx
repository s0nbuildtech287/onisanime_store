import React, { useId } from 'react';

interface BrandLogoProps {
  className?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'w-10 h-10' }) => {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id={`bg_${uid}`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e1135" />
          <stop offset="100%" stopColor="#070913" />
        </linearGradient>
        <linearGradient id={`neon_${uid}`} x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id={`horn_${uid}`} x1="20" y1="15" x2="80" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fdf2f8" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id={`play_${uid}`} x1="35" y1="35" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff6b9d" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="24"
        fill={`url(#bg_${uid})`}
        stroke={`url(#neon_${uid})`}
        strokeWidth="4.5"
      />
      <path d="M22 44 C18 26, 26 16, 36 14 C31 24, 31 32, 36 38 Z" fill={`url(#horn_${uid})`} />
      <path d="M78 44 C82 26, 74 16, 64 14 C69 24, 69 32, 64 38 Z" fill={`url(#horn_${uid})`} />
      <circle cx="50" cy="54" r="26" fill="#0f1426" stroke={`url(#neon_${uid})`} strokeWidth="3.5" />
      <path
        d="M43 42.5 L64 54 L43 65.5 Z"
        fill={`url(#play_${uid})`}
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M80 20 L82 25 L87 27 L82 29 L80 34 L78 29 L73 27 L78 25 Z" fill="#fde047" />
    </svg>
  );
};

export default BrandLogo;

