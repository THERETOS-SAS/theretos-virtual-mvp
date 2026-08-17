"use client";

import { useEffect, useRef, useState } from "react";
import { createGameResult } from "../../../lib/games/result";
import type { GameEngineProps } from "../../../types/games";
import { GameViewport } from "../GameViewport";

const DURATION_MS = 30_000;
type FallingObject = { x: number; y: number; radius: number; speed: number; type: "coin" | "bomb" };
type CatchEffect = { x: number; y: number; age: number; type: "coin" | "bomb" };

export function CoinCatchEngine({ phase, onComplete }: GameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef(0);
  const stateRef = useRef({ width: 360, height: 400, basketX: 145, elapsed: 0, spawnIn: 250, hudIn: 0, score: 0, coins: 0, bombs: 0, missed: 0, alertFlash: 0, objects: [] as FallingObject[], effects: [] as CatchEffect[] });
  const previousRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const [score, setScore] = useState(0);
  const [remaining, setRemaining] = useState(DURATION_MS);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(280, rect.width);
      const height = Math.max(300, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      stateRef.current.width = width;
      stateRef.current.height = height;
      stateRef.current.basketX = Math.min(stateRef.current.basketX, width - 70);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== "running") { previousRef.current = null; return; }
    let frame = 0;
    const tick = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const state = stateRef.current;
      const deltaMs = previousRef.current === null ? 0 : Math.min(50, now - previousRef.current);
      previousRef.current = now;
      const delta = deltaMs / 1000;
      state.elapsed += deltaMs;
      state.spawnIn -= deltaMs;
      state.hudIn -= deltaMs;
      state.alertFlash = Math.max(0, state.alertFlash - deltaMs);
      state.effects = state.effects.map((effect) => ({ ...effect, age: effect.age + deltaMs })).filter((effect) => effect.age < 420);
      state.basketX = Math.max(0, Math.min(state.width - 70, state.basketX + directionRef.current * 245 * delta));
      if (state.spawnIn <= 0) {
        const radius = 16;
        state.objects.push({ x: radius + Math.random() * (state.width - radius * 2), y: -radius, radius, speed: 150 + Math.random() * 105, type: Math.random() < .15 ? "bomb" : "coin" });
        state.spawnIn += 370;
      }
      const basketY = state.height - 42;
      state.objects = state.objects.filter((object) => {
        object.y += object.speed * delta;
        const nearestX = Math.max(state.basketX, Math.min(object.x, state.basketX + 70));
        const nearestY = Math.max(basketY, Math.min(object.y, basketY + 25));
        const caught = Math.hypot(object.x - nearestX, object.y - nearestY) <= object.radius;
        if (caught) {
          if (object.type === "coin") { state.score += 1; state.coins += 1; }
          else { state.score = Math.max(0, state.score - 3); state.bombs += 1; state.alertFlash = reducedMotionRef.current ? 0 : 180; }
          if (!reducedMotionRef.current) state.effects.push({ x: object.x, y: object.y, age: 0, type: object.type });
          setScore(state.score);
          return false;
        }
        if (object.y - object.radius > state.height) { state.missed += 1; return false; }
        return true;
      });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, state.width, state.height);
      const background = ctx.createLinearGradient(0, 0, 0, state.height);
      background.addColorStop(0, "#071127"); background.addColorStop(.55, "#0a1530"); background.addColorStop(1, "#07101e");
      ctx.fillStyle = background; ctx.fillRect(0, 0, state.width, state.height);
      const glow = ctx.createRadialGradient(state.width / 2, state.height * .58, 20, state.width / 2, state.height * .58, state.width * .7);
      glow.addColorStop(0, "rgba(244,185,30,.055)"); glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, state.width, state.height);
      ctx.strokeStyle = "rgba(122,151,215,.09)"; ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) { const x = (i * 71 + state.elapsed * .035) % (state.width + 30) - 15; const y = (i * 97) % state.height; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 24); ctx.stroke(); }
      ctx.fillStyle = "rgba(255,255,255,.15)";
      for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.arc((i * 53) % state.width, (i * 79) % state.height, 1.1, 0, Math.PI * 2); ctx.fill(); }
      if (state.alertFlash > 0) { ctx.fillStyle = `rgba(239,68,68,${state.alertFlash / 180 * .12})`; ctx.fillRect(0, 0, state.width, state.height); ctx.translate(Math.sin(state.elapsed * .13) * 1.5, 0); }
      for (const object of state.objects) {
        ctx.save();
        ctx.shadowColor = object.type === "coin" ? "rgba(244,185,30,.62)" : "rgba(239,68,68,.55)"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(object.x, object.y, object.radius, 0, Math.PI * 2);
        const objectGradient = ctx.createRadialGradient(object.x - 5, object.y - 6, 2, object.x, object.y, object.radius);
        if (object.type === "coin") { objectGradient.addColorStop(0, "#fff1a6"); objectGradient.addColorStop(.45, "#f4c52d"); objectGradient.addColorStop(1, "#b86a00"); }
        else { objectGradient.addColorStop(0, "#4b5563"); objectGradient.addColorStop(.6, "#171923"); objectGradient.addColorStop(1, "#07080c"); }
        ctx.fillStyle = objectGradient; ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = object.type === "coin" ? "#ffe690" : "#ff654f"; ctx.lineWidth = 2.5; ctx.stroke();
        if (object.type === "coin") {
          ctx.beginPath(); ctx.ellipse(object.x, object.y, object.radius * .52, object.radius * .72, 0, 0, Math.PI * 2); ctx.strokeStyle = "rgba(108,60,0,.48)"; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = "#6b3c00"; ctx.font = "900 14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("+1", object.x, object.y);
        } else {
          ctx.beginPath(); ctx.moveTo(object.x + 7, object.y - 13); ctx.quadraticCurveTo(object.x + 12, object.y - 21, object.x + 16, object.y - 16); ctx.strokeStyle = "#ff9b45"; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.fillStyle = "#ff6655"; ctx.font = "900 13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("-3", object.x, object.y + 1);
        }
        ctx.restore();
      }
      for (const effect of state.effects) {
        const progress = effect.age / 420; ctx.save(); ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = effect.type === "coin" ? "#ffe690" : "#ff6655"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, 12 + progress * 22, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = effect.type === "coin" ? "#fff4b0" : "#ff8070"; ctx.font = "900 16px sans-serif"; ctx.textAlign = "center"; ctx.fillText(effect.type === "coin" ? "+1" : "-3", effect.x, effect.y - progress * 34); ctx.restore();
      }
      ctx.save(); ctx.shadowColor = "rgba(244,185,30,.35)"; ctx.shadowBlur = 10;
      const basketGradient = ctx.createLinearGradient(0, basketY, 0, basketY + 25); basketGradient.addColorStop(0, "#ffc24c"); basketGradient.addColorStop(1, "#b85b0a");
      ctx.fillStyle = basketGradient; ctx.beginPath(); ctx.moveTo(state.basketX, basketY); ctx.lineTo(state.basketX + 70, basketY); ctx.lineTo(state.basketX + 62, basketY + 25); ctx.lineTo(state.basketX + 8, basketY + 25); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#ffe0a1"; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = "rgba(107,55,0,.55)"; ctx.lineWidth = 1.2;
      for (let x = 14; x < 70; x += 14) { ctx.beginPath(); ctx.moveTo(state.basketX + x, basketY + 2); ctx.lineTo(state.basketX + x - 5, basketY + 23); ctx.stroke(); }
      ctx.restore();
      const nextRemaining = Math.max(0, DURATION_MS - state.elapsed);
      if (state.hudIn <= 0) { setRemaining(nextRemaining); state.hudIn = 100; }
      if (nextRemaining <= 0) {
        state.objects = [];
        onComplete(createGameResult("atrapa-monedas", state.score, DURATION_MS, { coinsCaught: state.coins, bombsHit: state.bombs, objectsMissed: state.missed }));
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onComplete, phase]);

  const moveToPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "running") return;
    const rect = event.currentTarget.getBoundingClientRect();
    stateRef.current.basketX = Math.max(0, Math.min(stateRef.current.width - 70, event.clientX - rect.left - 35));
  };
  return <GameViewport label="Atrapa Monedas" className="coins-engine">
    <div className="engine-hud"><div><small>TIEMPO</small><strong>{Math.ceil(remaining / 1000)}</strong></div><div><small>PUNTOS</small><strong>{score}</strong></div></div>
    <div className="canvas-engine-wrap" ref={wrapRef}><canvas ref={canvasRef} onPointerDown={moveToPointer} onPointerMove={(event) => event.buttons && moveToPointer(event)} aria-label="Canasta, monedas y bombas en movimiento" /></div>
    <div className="coins-engine-controls"><button type="button" aria-label="Mover canasta a la izquierda" onPointerDown={(event) => { event.preventDefault(); directionRef.current = -1; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={() => directionRef.current = 0} onPointerCancel={() => directionRef.current = 0}>◀</button><button type="button" aria-label="Mover canasta a la derecha" onPointerDown={(event) => { event.preventDefault(); directionRef.current = 1; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={() => directionRef.current = 0} onPointerCancel={() => directionRef.current = 0}>▶</button></div>
  </GameViewport>;
}
