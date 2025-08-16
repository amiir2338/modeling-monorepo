'use client';
import { useEffect, useState } from 'react';

type Brand = 'default' | 'snapp' | 'digikala';

const labels: Record<Brand, string> = {
  default: 'Default',
  snapp: 'Snapp',
  digikala: 'Digikala',
};

export default function BrandSwitch() {
  const [brand, setBrand] = useState<Brand>('default');

  useEffect(() => {
    const saved = (localStorage.getItem('brand') as Brand) || 'default';
    setBrand(saved);
    document.documentElement.setAttribute('data-brand', saved);
  }, []);

  const set = (b: Brand) => {
    setBrand(b);
    localStorage.setItem('brand', b);
    document.documentElement.setAttribute('data-brand', b);
  };

  return (
    <div className="inline-flex items-center rounded-full border border-slate-200/60 overflow-hidden text-xs">
      {(['default','snapp','digikala'] as Brand[]).map((b, i) => (
        <button
          key={b}
          onClick={() => set(b)}
          className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
          style={{
            background:
              brand === b ? 'color-mix(in srgb, var(--brand-1) 10%, transparent)' : 'transparent',
            color: brand === b ? 'var(--ink)' : 'inherit',
            borderLeft: i ? '1px solid rgba(226,232,240,.6)' : 'none',
          }}
          title={labels[b]}
        >
          {labels[b]}
        </button>
      ))}
    </div>
  );
}
