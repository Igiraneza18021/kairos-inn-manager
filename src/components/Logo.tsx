// Custom Kairos Inn logo. Replace the SVG below with your own brand mark anytime.
// File location: src/components/Logo.tsx
type Props = { className?: string; showWordmark?: boolean };

export function Logo({ className = "", showWordmark = true }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
        className="h-9 w-9"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="kairosGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.55 0.16 40)" />
            <stop offset="100%" stopColor="oklch(0.7 0.14 65)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="10" fill="url(#kairosGrad)" />
        {/* simple house/roof mark */}
        <path
          d="M10 26 L24 13 L38 26 L38 37 L28 37 L28 28 L20 28 L20 37 L10 37 Z"
          fill="oklch(0.99 0.01 75)"
        />
      </svg>
      {showWordmark && (
        <div className="leading-tight">
          <div className="font-serif text-lg font-bold text-foreground">Kairos Inn</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Karangazi · Rwanda
          </div>
        </div>
      )}
    </div>
  );
}
