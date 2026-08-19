import type { CSSProperties } from 'react';

export const inputStyle: CSSProperties = {
  padding: '.6rem .7rem',
  border: '1px solid #ccc',
  borderRadius: 6,
  font: 'inherit',
};

export const buttonStyle: CSSProperties = {
  padding: '.65rem 1rem',
  background: '#12151a',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 600,
};

export const ghostButtonStyle: CSSProperties = {
  padding: '.5rem .9rem',
  background: 'none',
  border: '1px solid #ccc',
  borderRadius: 6,
  cursor: 'pointer',
  font: 'inherit',
};

export const errorStyle: CSSProperties = { color: '#b3261e' };
export const mutedStyle: CSSProperties = { color: '#666' };
