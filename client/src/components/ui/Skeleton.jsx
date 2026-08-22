export function SkeletonLine({ width = '100%', height = 12, style, className = '' }) {
  return (
    <span
      className={`skeleton skeleton-line ${className}`.trim()}
      style={{ width, height, display: 'block', ...style }}
    />
  );
}

export function SkeletonBlock({ className = '', style }) {
  return <div className={`skeleton ${className}`.trim()} style={style} />;
}

export function SkeletonCards({ count = 3, className = 'skeleton-card' }) {
  return (
    <div className="account-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} className={className} />
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className="stat-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} className="skeleton-stat" />
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 4 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} className="skeleton-row" />
      ))}
    </div>
  );
}
