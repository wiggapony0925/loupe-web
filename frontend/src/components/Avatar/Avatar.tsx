/**
 * Avatar — person initials in a circle, and AvatarStack — the overlapping
 * cluster fintech apps put on shared transactions. Monochrome by design:
 * identity comes from the initials, not from assigning people colors.
 */
export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '•';
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, size = 'md', selected = false }: AvatarProps) {
  return (
    <span
      className={`avatar avatar--${size}${selected ? ' avatar--selected' : ''}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

export interface AvatarStackProps {
  names: string[];
  max?: number;
}

export function AvatarStack({ names, max = 3 }: AvatarStackProps) {
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;
  if (shown.length === 0) return null;
  return (
    <span className="avatar-stack" aria-label={names.join(', ')}>
      {shown.map((name, index) => (
        <span key={`${name}-${index}`} className="avatar avatar--sm avatar-stack__item">
          {initialsOf(name)}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="avatar avatar--sm avatar-stack__item avatar-stack__more">+{overflow}</span>
      ) : null}
    </span>
  );
}
