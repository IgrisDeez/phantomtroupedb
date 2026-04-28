import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EmptyState, SectionCard } from "./Shared";

const chartTheme = {
  grid: "rgba(255,255,255,0.09)",
  tick: "#cbd5e1",
  purple: "#a78bfa",
  gold: "#f6d477",
  rose: "#fb7185"
};

export function Analytics({ tracker }) {
  const chartRows = tracker.latestRanking.map((row) => ({
    guild: row.guild,
    points: row.points,
    totalGain: row.totalGain ?? 0,
    gainPerHour: row.gainPerHour ?? 0,
    perMemberHour: row.perMemberHour ?? 0,
    gap: row.gap ?? 0
  }));

  const phantomGapRows = tracker.phantom
    ? tracker.phantomSummary.map((item) => ({ rank: `#${item.rank}`, gap: item.gap ?? 0 }))
    : [];

  if (!chartRows.length) {
    return <EmptyState title="No analytics yet" message="Paste leaderboard snapshots to generate charts for points, gains, pace, and rank gaps." />;
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Guild Points Comparison">
          <BarChart data={chartRows}>
            <ChartBase />
            <Bar dataKey="points" fill={chartTheme.purple} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Total Gain By Guild">
          <BarChart data={chartRows}>
            <ChartBase />
            <Bar dataKey="totalGain" fill={chartTheme.gold} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Gain Per Hour By Guild">
          <LineChart data={chartRows}>
            <ChartBase />
            <Line type="monotone" dataKey="gainPerHour" stroke={chartTheme.purple} strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Per Member / Hour By Guild">
          <LineChart data={chartRows}>
            <ChartBase />
            <Line type="monotone" dataKey="perMemberHour" stroke={chartTheme.gold} strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>
      </div>

      <ChartCard title="Phantom Gap Chart">
        {phantomGapRows.length ? (
          <BarChart data={phantomGapRows}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis dataKey="rank" stroke={chartTheme.tick} />
            <YAxis stroke={chartTheme.tick} />
            <Tooltip contentStyle={{ background: "#10111d", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} />
            <Bar dataKey="gap" fill={chartTheme.rose} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <EmptyState title="No Phantom gap chart" message="Make sure the tracked guild name exists in the latest snapshot." />
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <SectionCard title={title} eyebrow="Analytics">
      <div className="h-80 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

function ChartBase() {
  return (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
      <XAxis dataKey="guild" stroke={chartTheme.tick} tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={72} />
      <YAxis stroke={chartTheme.tick} />
      <Tooltip contentStyle={{ background: "#10111d", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} />
      <Legend />
    </>
  );
}
