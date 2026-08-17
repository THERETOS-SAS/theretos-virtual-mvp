"use client";

import { useEffect, useRef, useState } from "react";
import { createGameResult } from "../../../lib/games/result";
import type { GameEngineProps } from "../../../types/games";
import { GameViewport } from "../GameViewport";

const DURATION_MS = 15_000;

export function FreneticTapEngine({ phase, onComplete }: GameEngineProps) {
  const [taps, setTaps] = useState(0);
  const [remaining, setRemaining] = useState(DURATION_MS);
  const [feedback, setFeedback] = useState<number[]>([]);
  const elapsedRef = useRef(0);
  const previousRef = useRef<number | null>(null);
  const tapsRef = useRef(0);

  useEffect(() => {
    if (phase !== "running") { previousRef.current = null; return; }
    let frame = 0;
    const tick = (now: number) => {
      if (previousRef.current !== null) elapsedRef.current += Math.min(100, now - previousRef.current);
      previousRef.current = now;
      const nextRemaining = Math.max(0, DURATION_MS - elapsedRef.current);
      setRemaining(nextRemaining);
      if (nextRemaining <= 0) {
        const score = tapsRef.current;
        onComplete(createGameResult("tap-frenetico", score, DURATION_MS, { taps: score, tapsPerSecond: Number((score / 15).toFixed(2)) }));
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onComplete, phase]);

  const tap = () => {
    if (phase !== "running") return;
    tapsRef.current += 1;
    setTaps(tapsRef.current);
    const id = performance.now();
    setFeedback((items) => [...items.slice(-3), id]);
  };
  const urgent = remaining <= 5_000;

  return <GameViewport label="Tap Frenético" className={urgent ? "tap-engine urgent" : "tap-engine"}>
    <div className="engine-hud"><div><small>TIEMPO</small><strong>{Math.ceil(remaining / 1000)}</strong></div><div aria-live="polite"><small>TAPS</small><strong>{taps}</strong></div></div>
    <div className="tap-engine-target-wrap">
      <svg className="tap-engine-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="53" /><circle cx="60" cy="60" r="53" pathLength="100" style={{ strokeDashoffset: 100 - (remaining / DURATION_MS) * 100 }} /></svg>
      <button type="button" className="tap-engine-target" aria-label="Sumar un tap" onPointerDown={(event) => { event.preventDefault(); tap(); }}>TAP</button>
      {feedback.map((id, index) => <span className="tap-engine-feedback" style={{ transform: `translate(${(index - 1) * 28}px, ${-index * 9}px)` }} onAnimationEnd={() => setFeedback((items) => items.filter((item) => item !== id))} key={id}>+1</span>)}
    </div>
    <p>{urgent ? "¡Últimos segundos!" : "Cada toque cuenta."}</p>
  </GameViewport>;
}
