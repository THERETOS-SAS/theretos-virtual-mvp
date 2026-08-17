"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createGameResult } from "../../../lib/games/result";
import type { GameEngineProps } from "../../../types/games";
import { GameViewport } from "../GameViewport";

const DURATION_MS = 30_000;
type Mole = { id: number; hole: number; remaining: number };

export function WhackAMoleEngine({ phase, onComplete }: GameEngineProps) {
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [remaining, setRemaining] = useState(DURATION_MS);
  const [moles, setMoles] = useState<Mole[]>([]);
  const stateRef = useRef({ elapsed: 0, hits: 0, misses: 0, spawnIn: 250, nextId: 1, moles: [] as Mole[] });
  const previousRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "running") { previousRef.current = null; return; }
    let frame = 0;
    const tick = (now: number) => {
      const state = stateRef.current;
      const delta = previousRef.current === null ? 0 : Math.min(100, now - previousRef.current);
      previousRef.current = now;
      state.elapsed += delta;
      state.spawnIn -= delta;
      const expired = state.moles.filter((mole) => mole.remaining - delta <= 0).length;
      if (expired) { state.misses += expired; setMisses(state.misses); }
      state.moles = state.moles.map((mole) => ({ ...mole, remaining: mole.remaining - delta })).filter((mole) => mole.remaining > 0);
      let changed = expired > 0;
      if (state.spawnIn <= 0) {
        const occupied = new Set(state.moles.map((mole) => mole.hole));
        const available = Array.from({ length: 9 }, (_, hole) => hole).filter((hole) => !occupied.has(hole));
        if (available.length) { state.moles.push({ id: state.nextId++, hole: available[Math.floor(Math.random() * available.length)], remaining: 950 + Math.random() * 700 }); changed = true; }
        state.spawnIn = 400 + Math.random() * 600;
      }
      if (changed) setMoles([...state.moles]);
      const nextRemaining = Math.max(0, DURATION_MS - state.elapsed);
      setRemaining(nextRemaining);
      if (nextRemaining <= 0) {
        const attempts = state.hits + state.misses;
        onComplete(createGameResult("golpea-topos", state.hits, DURATION_MS, { hits: state.hits, misses: state.misses, accuracy: attempts ? Math.round((state.hits / attempts) * 100) : 0 }));
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onComplete, phase]);

  const hit = useCallback((hole: number) => {
    if (phase !== "running") return;
    const state = stateRef.current;
    const mole = state.moles.find((item) => item.hole === hole);
    if (!mole) {
      state.misses += 1;
      setMisses(state.misses);
      return;
    }
    state.moles = state.moles.filter((item) => item.id !== mole.id);
    state.hits += 1;
    setHits(state.hits);
    setMoles([...state.moles]);
  }, [phase]);

  return <GameViewport label="Golpea Topos" className="moles-engine">
    <div className="engine-hud"><div><small>TIEMPO</small><strong>{Math.ceil(remaining / 1000)}</strong></div><div><small>GOLPES</small><strong>{hits}</strong></div><div><small>FALLADOS</small><strong>{misses}</strong></div></div>
    <div className="moles-engine-grid">{Array.from({ length: 9 }, (_, hole) => {
      const active = moles.some((mole) => mole.hole === hole);
      return <button type="button" className={active ? "active" : ""} aria-label={active ? "Golpear topo" : "Casilla vacía"} onPointerDown={(event) => { event.preventDefault(); hit(hole); }} key={hole}>{active && <><svg className="mole-figure" viewBox="0 0 84 76" aria-hidden="true" style={{ position: "absolute", inset: "2% 6% 0", zIndex: 3, width: "88%", height: "98%", display: "block", overflow: "visible", opacity: 1, visibility: "visible", pointerEvents: "none" }}><ellipse cx="22" cy="29" rx="5" ry="4.5" transform="rotate(-12 22 29)" fill="#3b2b23" stroke="#8f6a50" strokeWidth="1"/><ellipse cx="62" cy="29" rx="5" ry="4.5" transform="rotate(12 62 29)" fill="#3b2b23" stroke="#8f6a50" strokeWidth="1"/><path d="M20 68 18 40C17 21 27 9 42 9s25 12 24 31l-2 28Z" fill="#584237" stroke="#b38a6e" strokeWidth="1.4"/><path d="M27 31l7 2m23-2-7 2" fill="none" stroke="#211713" strokeWidth="1.6" strokeLinecap="round"/><circle cx="32" cy="37" r="1.7" fill="#080706"/><circle cx="52" cy="37" r="1.7" fill="#080706"/><path d="M42 36C34 36 30 44 31 51c1 8 6 14 11 14s10-6 11-14c1-7-3-15-11-15Z" fill="#a77b61" stroke="#d1a78b" strokeWidth="1"/><path d="M37.5 58c1-4 8-4 9 0-.4 3.5-2.7 5.5-4.5 5.5s-4.1-2-4.5-5.5Z" fill="#d48782" stroke="#f0b8ae" strokeWidth=".9"/><path d="M42 63v3M30 50l-10-2m10 6-11 2m35-6 10-2m-10 6 11 2" fill="none" stroke="#d1b199" strokeWidth="1" strokeLinecap="round"/><path d="M23 65c4-3 8-3 11 1m27-1c-4-3-8-3-11 1" fill="none" stroke="#211713" strokeWidth="1.7" strokeLinecap="round"/></svg><span className="mole-hit-feedback" aria-hidden="true">+1</span></>}</button>;
    })}</div>
  </GameViewport>;
}
