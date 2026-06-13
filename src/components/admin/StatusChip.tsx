export function StatusChip({ status }: { status: "draft" | "published" | "scheduled" }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`ad-chip ad-chip-${status}`}>{label}</span>;
}
