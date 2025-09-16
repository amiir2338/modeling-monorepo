type Props = { label: string; value: number | string; hint?: string };

export default function StatCard({ label, value, hint }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-xs text-gray-500 mt-2">{hint}</div> : null}
    </div>
  );
}

