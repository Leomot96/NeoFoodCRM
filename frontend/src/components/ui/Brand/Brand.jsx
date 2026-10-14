import React from 'react';

const Brand = ({ className = '', variant = 'dark', height = 28 }) => {
  const logoSrc = variant === 'white' || variant === 'light' ? '/logo_blanco.svg' : '/logo_negro.svg';
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
      <img src="/isotipo.svg" alt="NeoFood" style={{ height: `${height}px`, width: 'auto', objectFit: 'contain' }} />
      <img src={logoSrc} alt="NeoFood" style={{ height: `${height * 0.72}px`, width: 'auto', objectFit: 'contain' }} />
    </span>
  );
};

export default Brand;
