import { STATUS_META } from "@/lib/reviewStatus";

// Reusable status indicator (grid cells, queue cards, legends).
// Always pairs an icon/glyph with color so status reads without a legend.
export const StatusChip = ({ status, showLabel = false, size = 14, className = "" }) => {
  const meta = STATUS_META[status];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${meta.bg} ${meta.text} ${meta.border} ${className}`}>
      {Icon ? <Icon size={size - 3} /> : <span className="font-bold leading-none" style={{ fontSize: size - 4 }}>½</span>}
      {showLabel && meta.label}
    </span>
  );
};

// Small icon-only badge for tight spaces (grid cells).
export const StatusIcon = ({ status, size = 11, className = "" }) => {
  const meta = STATUS_META[status];
  if (!meta) return null;
  const Icon = meta.icon;
  return Icon
    ? <Icon size={size} className={`${meta.text} ${className}`} />
    : <span className={`font-bold leading-none ${meta.text} ${className}`} style={{ fontSize: size }}>½</span>;
};
