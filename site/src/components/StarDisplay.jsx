export default function StarDisplay({
  count,
  max = 5,
  size = 20,
  color = "currentColor",
  letterSpacing = 2,
  lineHeight = 1,
  ariaLabel,
  title,
  style,
}) {
  const safeMax = Number.isFinite(max) ? Math.max(0, Math.trunc(max)) : 5;
  const safeCount = Number.isFinite(count) ? Math.min(safeMax, Math.max(0, Math.trunc(count))) : 0;
  const label = ariaLabel ?? `${safeCount} z ${safeMax} gwiazdek`;

  return (
    <span
      aria-label={label}
      title={title ?? label}
      style={{
        fontSize: size,
        letterSpacing,
        color,
        lineHeight,
        ...style,
      }}
    >
      {"★".repeat(safeCount)}{"☆".repeat(safeMax - safeCount)}
    </span>
  );
}