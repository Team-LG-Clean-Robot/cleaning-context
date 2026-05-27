"use client";

import { useEffect, useRef, useState } from "react";
import type { SensorState } from "@/lib/sensor-mock";
import { addNoise, getSensorStates } from "@/lib/sensor-mock";

import {
  CategoryScale,
  Chart as ChartJS,
  LineElement,
  LinearScale,
  PointElement,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { SensorIcon } from "./SensorIcon";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement);

const HISTORY_LEN = 20;
const TICK_MS = 1500;

type Props = {
  scenarioId: string | null;
  overrideSensors?: SensorState[];
};

function Sparkline({ history }: { history: number[] }) {
  const data = {
    labels: history.map((_, i) => i),
    datasets: [
      {
        data: history,
        borderColor: "oklch(50% 0 0)",
        borderWidth: 1.2,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    animation: { duration: 0 } as const,
  };
  return (
    <div className="h-[36px] w-full">
      <Line data={data} options={options} />
    </div>
  );
}

function LedDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        active
          ? "bg-[oklch(75%_0.15_145)] shadow-[0_0_6px_oklch(75%_0.15_145)] animate-pulse"
          : "bg-gray-300 dark:bg-gray-600"
      }`}
    />
  );
}

export function SensorDashboard({ scenarioId, overrideSensors }: Props) {
  const [sensors, setSensors] = useState<SensorState[]>(() => getSensorStates(null));
  const historyRef = useRef<Map<string, number[]>>(new Map());

  useEffect(() => {
    if (overrideSensors) return;
    const base = getSensorStates(scenarioId);
    setSensors(base);
    historyRef.current = new Map(base.map((s) => [s.id, [s.value]]));
  }, [scenarioId, overrideSensors]);

  useEffect(() => {
    if (overrideSensors) {
      setSensors(overrideSensors);
      for (const s of overrideSensors) {
        const h = historyRef.current.get(s.id) ?? [];
        h.push(s.value);
        if (h.length > HISTORY_LEN) h.shift();
        historyRef.current.set(s.id, h);
      }
      return;
    }
    if (!scenarioId) return;
    const id = setInterval(() => {
      setSensors((prev) => {
        const noisy = addNoise(prev);
        for (const s of noisy) {
          const h = historyRef.current.get(s.id) ?? [];
          h.push(s.value);
          if (h.length > HISTORY_LEN) h.shift();
          historyRef.current.set(s.id, h);
        }
        return noisy;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [scenarioId, overrideSensors]);

  const activeCount = sensors.filter((s) => s.active).length;

  return (
    <section aria-label="IoT 센서 대시보드">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-text-default uppercase tracking-wider">
          IoT 센서 모니터링
        </h2>
        <span className="text-[11px] text-text-muted">
          활성 {activeCount}/12
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {sensors.map((s) => {
          const history = historyRef.current.get(s.id) ?? [];
          const showChart = s.active && s.noiseRange > 0 && history.length > 2;
          return (
            <div
              key={s.id}
              className={`rounded-lg border p-2.5 transition-colors duration-300 ${
                s.active
                  ? "border-[oklch(75%_0.15_145)]/30 bg-surface-base"
                  : "border-border-default bg-surface-muted opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <SensorIcon sensorId={s.id} className={`w-5 h-5 ${s.active ? "text-text-default" : "text-gray-400"}`} />
                <LedDot active={s.active} />
              </div>
              <div className="text-[11px] font-medium text-text-default truncate">
                {s.name_ko}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5 truncate">
                {s.label}
              </div>
              {showChart && <Sparkline history={history} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
