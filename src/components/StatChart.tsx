"use client";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Lang } from "@/i18n/config";
import { formatNumber } from "@/i18n/format";

export default function StatChart({ data, lang }: { data: { period: string; value: number }[]; lang: Lang }) {
  const fmt = (v: number) => formatNumber(v, lang);
  return (
    <div className="h-80 rounded-xl border border-line bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 12, right: 12 }}>
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--muted)" }} stroke="var(--line)" />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} stroke="var(--line)" tickFormatter={fmt} width={80} />
          <Tooltip
            formatter={(v) => fmt(Number(v))}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
            labelStyle={{ color: "var(--ink)" }}
          />
          <Line type="monotone" dataKey="value" stroke="var(--link)" strokeWidth={3} dot={{ r: 3, fill: "var(--link)" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
