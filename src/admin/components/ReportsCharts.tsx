// Heavy chart components extracted from AdminReports so the recharts bundle
// (~120KB gzipped) can be code-split: the main reports page renders KPIs and
// CSV buttons immediately while this file streams in.

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const PIE_COLORS = ["hsl(215, 90%, 32%)", "hsl(45, 100%, 55%)", "hsl(142, 60%, 42%)"];

export interface RevenuePoint {
  month: string;
  revenue: number;
  bookings: number;
}

export interface SourcePoint {
  source: string;
  count: number;
}

interface RevenueChartProps {
  data: RevenuePoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 10%, 90%)" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 10%, 50%)" }} />
        <YAxis tick={{ fontSize: 12, fill: "hsl(215, 10%, 50%)" }} />
        <Tooltip
          contentStyle={{ background: "white", border: "1px solid hsl(215, 10%, 80%)", borderRadius: "8px", fontSize: "12px" }}
          formatter={(value: number) => [`€${value}`, "Të ardhura"]}
        />
        <Bar dataKey="revenue" fill="hsl(215, 90%, 32%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BookingsChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 10%, 90%)" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 10%, 50%)" }} />
        <YAxis tick={{ fontSize: 12, fill: "hsl(215, 10%, 50%)" }} />
        <Tooltip
          contentStyle={{ background: "white", border: "1px solid hsl(215, 10%, 80%)", borderRadius: "8px", fontSize: "12px" }}
          formatter={(value: number) => [value, "Rezervime"]}
        />
        <Line
          type="monotone"
          dataKey="bookings"
          stroke="hsl(45, 100%, 55%)"
          strokeWidth={2}
          dot={{ fill: "hsl(45, 100%, 55%)", r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface SourcePieProps {
  data: SourcePoint[];
}

export function SourcePieChart({ data }: SourcePieProps) {
  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width="50%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "white", border: "1px solid hsl(215, 10%, 80%)", borderRadius: "8px", fontSize: "12px" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={item.source} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="text-sm text-neutral-700">{item.source}</span>
            <span className="text-sm font-medium text-neutral-900 ml-auto">{item.count}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
