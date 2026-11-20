import type { CSSProperties } from 'react';
import campus from '../../assets/branding/cot building.jpg';

interface AuthBackgroundProps {
  style?: CSSProperties;
}

export function AuthBackground({ style }: AuthBackgroundProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={style}>
      <img src={campus} alt="" className="h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-900/65 to-brand-900/35" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-brand-900" />
    </div>
  );
}
