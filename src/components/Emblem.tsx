import React from 'react';
import { CardTheme } from '../types/card';

interface EmblemProps {
  className?: string;
  size?: number;
  theme?: CardTheme;
}

export const Emblem: React.FC<EmblemProps> = ({ 
  className = '', 
  size = 40,
  theme = 'obsidian' 
}) => {
  // Refined monochrome palette mapping per theme
  let strokeColor = '#FAFAFA';
  let accentColor = '#A1A1AA';

  if (theme === 'cotton' || theme === 'pure_white') {
    strokeColor = '#0A0A0B';
    accentColor = '#52525B';
  } else if (theme === 'warm_paper' || theme === 'sand') {
    strokeColor = '#121214';
    accentColor = '#71717A';
  } else if (theme === 'navy' || theme === 'classic_navy') {
    strokeColor = '#FAFAFA';
    accentColor = '#A1A1AA';
  } else if (theme === 'emerald' || theme === 'deep_forest') {
    strokeColor = '#FAFAFA';
    accentColor = '#D4D4D8';
  } else if (theme === 'slate' || theme === 'titanium') {
    strokeColor = '#E4E4E7';
    accentColor = '#A1A1AA';
  }

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Korean Center Global Network Emblem"
    >
      {/* Outer refined architectural boundary ring */}
      <circle 
        cx="50" 
        cy="50" 
        r="46" 
        stroke={strokeColor} 
        strokeWidth="1.2" 
        strokeOpacity="0.85" 
      />
      
      {/* Inner latitude & meridian lines representing global network */}
      <ellipse 
        cx="50" 
        cy="50" 
        rx="26" 
        ry="46" 
        stroke={strokeColor} 
        strokeWidth="0.9" 
        strokeOpacity="0.6" 
      />
      <line 
        x1="4" 
        y1="50" 
        x2="96" 
        y2="50" 
        stroke={strokeColor} 
        strokeWidth="0.9" 
        strokeOpacity="0.6" 
      />
      <line 
        x1="50" 
        y1="4" 
        x2="50" 
        y2="96" 
        stroke={strokeColor} 
        strokeWidth="0.9" 
        strokeOpacity="0.6" 
      />

      {/* Modernist Korean Center stylized "K" & Global focal point */}
      <path 
        d="M38 30 V70 M38 50 L62 30 M46 43 L62 70" 
        stroke={strokeColor} 
        strokeWidth="2.2" 
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Cardinal accent tick marks */}
      <circle cx="50" cy="8" r="1.5" fill={accentColor} />
      <circle cx="92" cy="50" r="1.5" fill={accentColor} />
      <circle cx="50" cy="92" r="1.5" fill={accentColor} />
      <circle cx="8" cy="50" r="1.5" fill={accentColor} />
    </svg>
  );
};
