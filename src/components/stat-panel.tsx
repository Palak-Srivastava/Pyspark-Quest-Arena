type StatPanelProps = {
  label: string;
  value: string;
  delta: string;
};

export function StatPanel({ label, value, delta }: StatPanelProps) {
  return (
    <div className="panel rounded-2xl p-4">
      <p className="hud-title text-[10px] text-slate-400">{label}</p>
      <p className="headline mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-amber-200">{delta}</p>
    </div>
  );
}
