'use client';

import { useEffect, useState } from 'react';

function useIsLight(): boolean {
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isLight;
}

export interface ChartTheme {
  tooltipStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  tickFill: string;
  tickFillMuted: string;
  gridStroke: string;
  emptyHeatCell: string;
}

export function useChartTheme(): ChartTheme {
  const isLight = useIsLight();

  if (isLight) {
    return {
      tooltipStyle: {
        backgroundColor: '#F5F0EA',
        border: '1px solid #C8C2BA',
        borderRadius: '12px',
        padding: '10px 14px',
        color: '#181410',
        fontSize: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
      },
      labelStyle: { color: '#4A4541', marginBottom: 4 },
      tickFill: '#5A5550',
      tickFillMuted: '#7A7570',
      gridStroke: 'rgba(0,0,0,0.10)',
      emptyHeatCell: 'rgba(200,194,186,0.55)',
    };
  }

  return {
    tooltipStyle: {
      backgroundColor: '#13131A',
      border: '1px solid #2A2A38',
      borderRadius: '12px',
      padding: '10px 14px',
      color: '#F0EDE8',
      fontSize: '12px',
    },
    labelStyle: { color: '#9A9490', marginBottom: 4 },
    tickFill: '#6A6560',
    tickFillMuted: '#8A8A9A',
    gridStroke: 'rgba(255,255,255,0.06)',
    emptyHeatCell: 'rgba(42,42,56,0.60)',
  };
}
