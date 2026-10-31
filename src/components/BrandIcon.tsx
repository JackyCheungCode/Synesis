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
          event.currentTarget.parentElement?.classList.add('brand-icon--fallback');
        }}
      />
      <span aria-hidden="true">{fallback}</span>
    </span>
  );
}