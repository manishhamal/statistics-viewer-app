"use client";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Lang } from "@/i18n/config";
import { formatNumber } from "@/i18n/format";

export default function StatChart({ data, lang }: { data: { period: string; value: number }[]; lang: Lang }) {
  const fmt = (v: number) => formatNumber(v, lang);
  return (
    <div className="h-80 rounded-xl border border-[#dce2e4] bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 12, right: 12 }}>
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} width={80} />
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Line type="monotone" dataKey="value" stroke="#2c6eaa" strokeWidth={3} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
