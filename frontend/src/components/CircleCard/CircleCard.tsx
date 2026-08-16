/**
 * CircleCard — one circle in the list: name, member strip, and (when the
 * ledger is cached) YOUR position in it, red when you owe.
 */
import { money } from '@/lib/format';
import type { Circle, Ledger } from '@/types/types';

export interface CircleCardProps {
  circle: Circle;
  ledger?: Ledger;
  meUserId: string;
  onPress: (circle: Circle) => void;
}

export function CircleCard({ circle, ledger, meUserId, onPress }: CircleCardProps) {
  const myNet = ledger?.members.find((m) => m.userId === meUserId)?.netCents ?? null;

  return (
    <button type="button" className="circle-card" onClick={() => onPress(circle)}>
      <div className="circle-card__main">
        <span className="circle-card__name">{circle.name}</span>
        <span className="circle-card__members">
          {circle.members.map((m) => m.displayName).join(' · ')}
        </span>
      </div>
      {myNet !== null && myNet !== 0 ? (
        <span className={`circle-card__net${myNet < 0 ? ' circle-card__net--owing' : ''}`}>
          {myNet > 0 ? `you're owed ${money(myNet)}` : `you owe ${money(-myNet)}`}
        </span>
      ) : (
        <span className="circle-card__net circle-card__net--even">settled up</span>
      )}
    </button>
  );
}
