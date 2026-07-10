/**
 * AuroraCanvas — fixed z-0 background layer.
 * Renders five aurora glow field divs using classes from aurora.css.
 * pointer-events: none — never intercepts clicks.
 */
export function AuroraCanvas() {
  return (
    <div className="aurora-canvas" aria-hidden="true">
      <div className="aurora-field aurora-violet" />
      <div className="aurora-field aurora-emerald" />
      <div className="aurora-field aurora-blue" />
      <div className="aurora-field aurora-magenta" />
      <div className="aurora-field aurora-teal" />
    </div>
  );
}
