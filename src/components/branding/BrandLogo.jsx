import { useBrand } from '@/lib/brandContext';

// Renders the appropriate uploaded logo variant, or the styled text wordmark
// fallback. `variant`: 'color' (default, light backgrounds) or 'white' (dark
// backgrounds — uses white logo, falls back to dark, then color).
export default function BrandLogo({ variant = 'color', className = '', imgClassName = '', wordmarkClassName = '' }) {
  const { branding, wordmark } = useBrand();

  let url = null;
  if (variant === 'white') {
    url = branding?.logo_white_url || branding?.logo_dark_url || branding?.logo_color_url;
  } else {
    url = branding?.logo_color_url;
  }

  if (url) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <img src={url} alt={wordmark} className={imgClassName || 'h-8 w-auto object-contain'} />
      </span>
    );
  }

  // Text wordmark fallback — Questa Bold in brand blue (or white on dark).
  const colorClass = variant === 'white' ? 'text-white' : 'text-brand';
  return (
    <span className={`inline-flex items-center font-heading font-bold ${colorClass} ${wordmarkClassName || 'text-base'} ${className}`}>
      {wordmark}
    </span>
  );
}