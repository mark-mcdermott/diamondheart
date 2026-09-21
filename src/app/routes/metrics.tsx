import { useParams } from "react-router";
import { MetricsClient } from "@/app/sections/metrics/metrics-client";
import { MetricDetailClient } from "@/app/sections/metrics/[id]/metric-detail-client";
import { MetricEditClient } from "@/app/sections/metrics/[id]/edit/edit-client";

export function MetricsRoute() {
  return <MetricsClient />;
}

export function MetricDetailRoute() {
  const { id = "" } = useParams();
  return <MetricDetailClient id={id} />;
}

export function MetricEditRoute() {
  const { id = "" } = useParams();
  return <MetricEditClient id={id} />;
}
