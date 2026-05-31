import { Card } from "@/components/ui/Card";

type Props = {
  label: string;
  value: string;
  detail: string;
};

export function DashboardMetricCard({ label, value, detail }: Props) {
  return (
    <Card>
      <p className="text-sm font-semibold text-ink/60">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-normal">{value}</p>
      <p className="mt-1 text-sm text-ink/60">{detail}</p>
    </Card>
  );
}
