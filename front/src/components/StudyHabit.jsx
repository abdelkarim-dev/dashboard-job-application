import React, { useEffect, useState } from "react";
import { loadPoints, effectiveStreak, pointsToday, reminderFor } from "../lib/points.mjs";

// The habit banner: total points, today's points, current streak, and a
// reminder line. Refreshes whenever any surface awards points (the "learn:points"
// event) so the streak updates live as you study.
export default function PointsBanner({ compact = false }) {
  const [ledger, setLedger] = useState(loadPoints);

  useEffect(() => {
    const refresh = () => setLedger(loadPoints());
    document.addEventListener("learn:points", refresh);
    // Also refresh on focus, in case points were earned in another tab.
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("learn:points", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const streak = effectiveStreak(ledger);
  const today = pointsToday(ledger);
  const reminder = reminderFor(ledger);

  return (
    <div className={`habit-banner ${compact ? "compact" : ""}`}>
      <div className="habit-stat habit-streak">
        <span className="habit-flame" aria-hidden="true">🔥</span>
        <strong>{streak}</strong>
        <small>day streak</small>
      </div>
      <div className="habit-stat">
        <strong>{today}</strong>
        <small>points today</small>
      </div>
      <div className="habit-stat">
        <strong>{ledger.total || 0}</strong>
        <small>total points</small>
      </div>
      <p className={`habit-reminder tone-${reminder.tone}`}>{reminder.text}</p>
    </div>
  );
}
