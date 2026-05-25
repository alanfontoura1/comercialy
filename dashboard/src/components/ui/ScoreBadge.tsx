import clsx from 'clsx';

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
      score >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
      score >= 40 ? 'bg-amber-500/20 text-amber-400' :
      'bg-rose-500/20 text-rose-400'
    )}>
      {score}
    </span>
  );
}
