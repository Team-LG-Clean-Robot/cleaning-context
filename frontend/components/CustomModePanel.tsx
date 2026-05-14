"use client";
import { useState } from "react";
import type { CustomRequest, EventMeta, RoomId } from "@/lib/types";
import { HHMM, ROOM_IDS, ROOM_LABEL } from "@/lib/types";

type Props = {
  events: EventMeta[];
  value: CustomRequest;
  loading: boolean;
  onChange: (next: CustomRequest) => void;
  onSubmit: (req: CustomRequest) => void;
};

const PRESET_FILL: CustomRequest = {
  current_time: "20:30",
  sleep_time: "23:00",
  user_location: null,
  active_events: ["rain", "user_returned", "pre_sleep_2h"],
  gap_rooms: [],
};

export function CustomModePanel({
  events,
  value,
  loading,
  onChange,
  onSubmit,
}: Props) {
  const [touched, setTouched] = useState(false);

  const timeError = (t: string) => (!HHMM.test(t) ? "HH:MM 형식 (24h)" : null);
  const errors = {
    current_time: timeError(value.current_time),
    sleep_time: timeError(value.sleep_time),
    events: value.active_events.length > 10 ? "최대 10개" : null,
  };
  const valid =
    !errors.current_time && !errors.sleep_time && !errors.events;

  const toggleEvent = (id: string) => {
    const has = value.active_events.includes(id);
    onChange({
      ...value,
      active_events: has
        ? value.active_events.filter((e) => e !== id)
        : [...value.active_events, id],
    });
  };

  const handleSubmit = () => {
    setTouched(true);
    if (!valid) return;
    onSubmit(value);
  };

  return (
    <section className="bg-white border border-line rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">상황 직접 입력</h2>
        <button
          type="button"
          onClick={() => onChange(PRESET_FILL)}
          className="text-[12px] underline text-ink-2 hover:text-ink"
        >
          예시 복원
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">현재 시각</span>
          <input
            type="time"
            value={value.current_time}
            onChange={(e) =>
              onChange({ ...value, current_time: e.target.value })
            }
            className={`mt-1 w-full border rounded-lg px-3 py-2 text-[14px]
              ${
                touched && errors.current_time
                  ? "border-lg-red"
                  : "border-line"
              }
              focus:outline-none focus:ring-2 focus:ring-lg-red/30`}
          />
          {touched && errors.current_time && (
            <p className="text-[11px] text-lg-red mt-1">
              {errors.current_time}
            </p>
          )}
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">취침 예정</span>
          <input
            type="time"
            value={value.sleep_time}
            onChange={(e) =>
              onChange({ ...value, sleep_time: e.target.value })
            }
            className={`mt-1 w-full border rounded-lg px-3 py-2 text-[14px]
              ${
                touched && errors.sleep_time
                  ? "border-lg-red"
                  : "border-line"
              }
              focus:outline-none focus:ring-2 focus:ring-lg-red/30`}
          />
          {touched && errors.sleep_time && (
            <p className="text-[11px] text-lg-red mt-1">
              {errors.sleep_time}
            </p>
          )}
        </label>
      </div>

      <label className="block">
        <span className="text-[13px] font-medium text-ink-2">사용자 위치</span>
        <select
          value={value.user_location ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              user_location: (e.target.value || null) as RoomId | null,
            })
          }
          className="mt-1 w-full border border-line rounded-lg px-3 py-2 text-[14px] bg-white
                     focus:outline-none focus:ring-2 focus:ring-lg-red/30"
        >
          <option value="">사용자 없음 / 외출</option>
          {ROOM_IDS.map((id) => (
            <option key={id} value={id}>
              {ROOM_LABEL[id]}
            </option>
          ))}
        </select>
      </label>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-ink-2">이벤트</span>
          <span className="text-[11px] text-ink-3">
            {value.active_events.length} / 10 선택
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {events.map((e) => {
            const selected = value.active_events.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleEvent(e.id)}
                aria-pressed={selected}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium border transition
                  ${
                    selected
                      ? "bg-lg-red text-white border-lg-red"
                      : "bg-white text-ink border-line hover:bg-paper"
                  }`}
              >
                {e.name_ko}
              </button>
            );
          })}
        </div>
        {touched && errors.events && (
          <p className="text-[11px] text-lg-red mt-1">{errors.events}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full rounded-lg px-4 py-2.5 text-[14px] font-semibold transition
          ${
            loading
              ? "bg-ink/40 cursor-wait text-white"
              : "bg-ink text-white hover:bg-ink/90"
          }
          focus:outline-none focus:ring-2 focus:ring-ink/40`}
      >
        {loading ? "시뮬레이션 중…" : "시뮬레이션 실행"}
      </button>
    </section>
  );
}
