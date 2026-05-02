// Custom Kairos Inn logo. Files live in /public — replace anytime.
//   /public/kairos-icon.svg      — the icon mark
//   /public/kairos-wordmark.svg  — full logo with text
//   /public/favicon.svg          — browser tab icon
type Props = { className?: string; showWordmark?: boolean; iconClassName?: string };

export function Logo({ className = "", showWordmark = true, iconClassName = "h-9 w-9" }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/kairos-icon.svg"
        alt="Kairos Inn logo"
        className={iconClassName}
        width={48}
        height={48}
      />
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
