import type { CSSProperties } from 'react';

type BrandIconProps = {
  slug: string;
  label: string;
  fallback: string;
  size?: number;
};

export function BrandIcon({ slug, label, fallback, size = 28 }: BrandIconProps) {
  const style: CSSProperties = { width: size, height: size };
  return (
    <span className="brand-icon" style={style} title={label} aria-label={label}>
      <img
        src={`https://cdn.simpleicons.org/${slug}`}
        alt=""
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
          const fallback = event.currentTarget.parentElement?.querySelector('span[aria-hidden="true"]') as HTMLElement | null;
          if (fallback) fallback.style.display = 'grid';
        }}
      />
      <span aria-hidden="true" style={{ display: 'none' }}>{fallback}</span>
    </span>
  );
}