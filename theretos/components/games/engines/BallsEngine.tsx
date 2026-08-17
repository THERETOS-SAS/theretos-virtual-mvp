"use client";

import { useEffect, useRef, useState } from "react";
import { createGameResult } from "../../../lib/games/result";
import type { GameEngineProps } from "../../../types/games";
import { GameViewport } from "../GameViewport";

type LevelConfig = { obstacleCount: number; enemyCount: number; obstacleSpeed: number; enemySpeed: number; ballSpeed: number };
const LEVELS: readonly LevelConfig[] = [
  { obstacleCount: 5, enemyCount: 0, obstacleSpeed: 38, enemySpeed: 0, ballSpeed: 210 },
  { obstacleCount: 6, enemyCount: 0, obstacleSpeed: 42, enemySpeed: 0, ballSpeed: 220 },
  { obstacleCount: 7, enemyCount: 0, obstacleSpeed: 46, enemySpeed: 0, ballSpeed: 230 },
  { obstacleCount: 7, enemyCount: 1, obstacleSpeed: 48, enemySpeed: 55, ballSpeed: 235 },
  { obstacleCount: 8, enemyCount: 1, obstacleSpeed: 50, enemySpeed: 60, ballSpeed: 240 },
  { obstacleCount: 8, enemyCount: 1, obstacleSpeed: 54, enemySpeed: 65, ballSpeed: 245 },
  { obstacleCount: 9, enemyCount: 2, obstacleSpeed: 56, enemySpeed: 68, ballSpeed: 250 },
  { obstacleCount: 9, enemyCount: 2, obstacleSpeed: 60, enemySpeed: 72, ballSpeed: 255 },
  { obstacleCount: 10, enemyCount: 2, obstacleSpeed: 62, enemySpeed: 76, ballSpeed: 260 },
  { obstacleCount: 10, enemyCount: 3, obstacleSpeed: 65, enemySpeed: 80, ballSpeed: 265 },
  { obstacleCount: 11, enemyCount: 3, obstacleSpeed: 68, enemySpeed: 84, ballSpeed: 270 },
  { obstacleCount: 11, enemyCount: 3, obstacleSpeed: 72, enemySpeed: 88, ballSpeed: 275 },
  { obstacleCount: 12, enemyCount: 4, obstacleSpeed: 75, enemySpeed: 92, ballSpeed: 280 },
  { obstacleCount: 12, enemyCount: 4, obstacleSpeed: 79, enemySpeed: 96, ballSpeed: 285 },
  { obstacleCount: 13, enemyCount: 4, obstacleSpeed: 84, enemySpeed: 102, ballSpeed: 290 },
] as const;
type Circle = { x: number; y: number; vx: number; vy: number; r: number };
type Enemy = Circle & { size: number };

function movingCircle(width: number, height: number, speed: number, radius = 10): Circle {
  const angle = Math.random() * Math.PI * 2;
  return { x: 25 + Math.random() * Math.max(1, width - 50), y: 25 + Math.random() * Math.max(1, height - 50), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: radius };
}

export function BallsEngine({ phase, onComplete }: GameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ width: 360, height: 410, elapsed: 0, score: 0, lives: 3, level: 0, cleared: 0, invulnerable: 0, hitFlash: null as { x: number; y: number; age: number } | null, damageFlash: 0, levelFlash: 0, ball: { x: 180, y: 205, vx: 0, vy: 0, r: 12 } as Circle, obstacles: [] as Circle[], enemies: [] as Enemy[] });
  const previousRef = useRef<number | null>(null);
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1 });

  const createLevel = (index: number) => {
    const state = stateRef.current;
    const config = LEVELS[index];
    state.obstacles = Array.from({ length: config.obstacleCount }, () => movingCircle(state.width, state.height, config.obstacleSpeed));
    state.enemies = Array.from({ length: config.enemyCount }, () => ({ ...movingCircle(state.width, state.height, config.enemySpeed, 15), size: 30 }));
  };

  useEffect(() => {
    const wrap = wrapRef.current; const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(280, rect.width); const height = Math.max(320, rect.height);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      const state = stateRef.current; state.width = width; state.height = height;
      state.ball.x = Math.min(state.ball.x, width - state.ball.r); state.ball.y = Math.min(state.ball.y, height - state.ball.r);
      if (!state.obstacles.length) createLevel(state.level);
    };
    const observer = new ResizeObserver(resize); observer.observe(wrap); resize(); return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== "running") { previousRef.current = null; return; }
    let frame = 0;
    const tick = (now: number) => {
      const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
      const state = stateRef.current; const deltaMs = previousRef.current === null ? 0 : Math.min(40, now - previousRef.current); previousRef.current = now; const dt = deltaMs / 1000;
      state.elapsed += deltaMs; state.invulnerable = Math.max(0, state.invulnerable - deltaMs); state.damageFlash = Math.max(0, state.damageFlash - deltaMs); state.levelFlash = Math.max(0, state.levelFlash - deltaMs); if (state.hitFlash) { state.hitFlash.age += deltaMs; if (state.hitFlash.age >= 420) state.hitFlash = null; }
      const move = (item: Circle) => { item.x += item.vx * dt; item.y += item.vy * dt; if (item.x < item.r || item.x > state.width - item.r) { item.vx *= -1; item.x = Math.max(item.r, Math.min(state.width - item.r, item.x)); } if (item.y < item.r || item.y > state.height - item.r) { item.vy *= -1; item.y = Math.max(item.r, Math.min(state.height - item.r, item.y)); } };
      move(state.ball); state.obstacles.forEach(move); state.enemies.forEach(move);
      state.obstacles = state.obstacles.filter((obstacle) => {
        if (Math.hypot(state.ball.x - obstacle.x, state.ball.y - obstacle.y) > state.ball.r + obstacle.r) return true;
        const dx = state.ball.x - obstacle.x; const dy = state.ball.y - obstacle.y; const length = Math.hypot(dx, dy) || 1; const nx = dx / length; const ny = dy / length; const dot = state.ball.vx * nx + state.ball.vy * ny; state.ball.vx -= 2 * dot * nx; state.ball.vy -= 2 * dot * ny;
        state.score += 1; state.cleared += 1; state.hitFlash = { x: obstacle.x, y: obstacle.y, age: 0 }; setHud({ score: state.score, lives: state.lives, level: state.level + 1 }); return false;
      });
      if (!state.obstacles.length) {
        if (state.level >= LEVELS.length - 1) { onComplete(createGameResult("bolas", state.score, state.elapsed, { levelReached: LEVELS.length, livesRemaining: state.lives, obstaclesCleared: state.cleared })); return; }
        state.level += 1; state.levelFlash = 650; createLevel(state.level); setHud({ score: state.score, lives: state.lives, level: state.level + 1 });
      }
      if (!state.invulnerable && state.enemies.some((enemy) => Math.hypot(state.ball.x - enemy.x, state.ball.y - enemy.y) <= state.ball.r + enemy.r)) {
        state.lives -= 1; state.invulnerable = 900; state.damageFlash = 260; state.ball.x = state.width / 2; state.ball.y = state.height / 2; state.ball.vx = 0; state.ball.vy = 0; setHud({ score: state.score, lives: state.lives, level: state.level + 1 });
        if (state.lives <= 0) { onComplete(createGameResult("bolas", state.score, state.elapsed, { levelReached: state.level + 1, livesRemaining: 0, obstaclesCleared: state.cleared })); return; }
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, state.width, state.height);
      const field = ctx.createLinearGradient(0, 0, 0, state.height); field.addColorStop(0, "#071225"); field.addColorStop(.55, "#050b17"); field.addColorStop(1, "#030711"); ctx.fillStyle = field; ctx.fillRect(0, 0, state.width, state.height);
      const depth = ctx.createRadialGradient(state.width / 2, state.height * .48, 18, state.width / 2, state.height * .48, Math.max(state.width, state.height) * .68); depth.addColorStop(0, "rgba(69,213,44,.045)"); depth.addColorStop(.52, "rgba(138,44,255,.025)"); depth.addColorStop(1, "rgba(0,0,0,.16)"); ctx.fillStyle = depth; ctx.fillRect(0, 0, state.width, state.height);
      ctx.lineWidth = 1; for (let x = 0; x < state.width; x += 32) { const distance = Math.abs(x - state.width / 2) / Math.max(1, state.width / 2); ctx.strokeStyle = `rgba(113,91,178,${.11 - distance * .055})`; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, state.height); ctx.stroke(); } for (let y = 0; y < state.height; y += 32) { const distance = Math.abs(y - state.height / 2) / Math.max(1, state.height / 2); ctx.strokeStyle = `rgba(113,91,178,${.11 - distance * .055})`; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(state.width, y); ctx.stroke(); }
      state.obstacles.forEach((item) => { ctx.save(); ctx.translate(item.x, item.y); ctx.beginPath(); for (let side = 0; side < 6; side++) { const angle = Math.PI / 3 * side - Math.PI / 6; const x = Math.cos(angle) * item.r; const y = Math.sin(angle) * item.r; if (!side) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); const crystal = ctx.createRadialGradient(-3, -4, 1, 0, 0, item.r); crystal.addColorStop(0, "#fff3a6"); crystal.addColorStop(.38, "#f4c735"); crystal.addColorStop(1, "#a95c00"); ctx.fillStyle = crystal; ctx.shadowColor = "rgba(244,185,30,.55)"; ctx.shadowBlur = 9; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = "#ffe287"; ctx.lineWidth = 1.4; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(4, 0); ctx.lineTo(-1, 7); ctx.strokeStyle = "rgba(117,63,0,.48)"; ctx.stroke(); ctx.restore(); });
      state.enemies.forEach((item) => { ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(Math.PI / 4); const danger = ctx.createRadialGradient(-4, -4, 1, 0, 0, item.r); danger.addColorStop(0, "#ff9a65"); danger.addColorStop(.42, "#ef4438"); danger.addColorStop(1, "#5d0b12"); ctx.fillStyle = danger; ctx.shadowColor = "rgba(239,68,68,.58)"; ctx.shadowBlur = 12; ctx.fillRect(-item.r * .78, -item.r * .78, item.r * 1.56, item.r * 1.56); ctx.shadowBlur = 0; ctx.strokeStyle = "#ff8068"; ctx.lineWidth = 1.8; ctx.strokeRect(-item.r * .78, -item.r * .78, item.r * 1.56, item.r * 1.56); ctx.rotate(-Math.PI / 4); ctx.beginPath(); ctx.arc(0, 0, item.r * .34, 0, Math.PI * 2); ctx.fillStyle = "#21070a"; ctx.fill(); ctx.strokeStyle = "rgba(255,182,146,.7)"; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); });
      const velocity = Math.hypot(state.ball.vx, state.ball.vy); if (velocity > 1) { const nx = state.ball.vx / velocity; const ny = state.ball.vy / velocity; const trail = ctx.createLinearGradient(state.ball.x, state.ball.y, state.ball.x - nx * 42, state.ball.y - ny * 42); trail.addColorStop(0, "rgba(129,240,93,.52)"); trail.addColorStop(1, "rgba(69,213,44,0)"); ctx.beginPath(); ctx.moveTo(state.ball.x, state.ball.y); ctx.lineTo(state.ball.x - nx * 42, state.ball.y - ny * 42); ctx.strokeStyle = trail; ctx.lineWidth = state.ball.r * .72; ctx.lineCap = "round"; ctx.stroke(); }
      ctx.save(); ctx.beginPath(); ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2); const player = ctx.createRadialGradient(state.ball.x - 4, state.ball.y - 5, 1, state.ball.x, state.ball.y, state.ball.r); player.addColorStop(0, "#efffe9"); player.addColorStop(.25, state.invulnerable ? "rgba(129,240,93,.55)" : "#81f05d"); player.addColorStop(1, state.invulnerable ? "rgba(18,117,21,.42)" : "#15850d"); ctx.fillStyle = player; ctx.shadowColor = "rgba(69,213,44,.75)"; ctx.shadowBlur = 15; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = "#baffaa"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath(); ctx.arc(state.ball.x - 4, state.ball.y - 5, 2.2, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fill(); ctx.restore();
      if (state.hitFlash) { const progress = state.hitFlash.age / 420; ctx.save(); ctx.globalAlpha = 1 - progress; ctx.beginPath(); ctx.arc(state.hitFlash.x, state.hitFlash.y, 10 + progress * 24, 0, Math.PI * 2); ctx.strokeStyle = "#ffe17d"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#fff2ad"; ctx.font = "900 15px sans-serif"; ctx.textAlign = "center"; ctx.fillText("+1", state.hitFlash.x, state.hitFlash.y - progress * 30); ctx.restore(); }
      if (state.damageFlash > 0) { ctx.fillStyle = `rgba(239,68,68,${state.damageFlash / 260 * .16})`; ctx.fillRect(0, 0, state.width, state.height); }
      if (state.levelFlash > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, state.levelFlash / 220); ctx.fillStyle = "rgba(3,7,17,.68)"; ctx.fillRect(0, state.height / 2 - 34, state.width, 68); ctx.fillStyle = "#81f05d"; ctx.font = "900 22px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`NIVEL ${state.level + 1}`, state.width / 2, state.height / 2); ctx.restore(); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [onComplete, phase]);

  const aim = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "running") return;
    const state = stateRef.current; const rect = event.currentTarget.getBoundingClientRect(); const tx = event.clientX - rect.left; const ty = event.clientY - rect.top; const dx = tx - state.ball.x; const dy = ty - state.ball.y; const distance = Math.hypot(dx, dy); if (distance < 2) return;
    const speed = LEVELS[state.level].ballSpeed; state.ball.vx = dx / distance * speed; state.ball.vy = dy / distance * speed;
  };

  return <GameViewport label="Bolas" className="balls-engine">
    <div className="engine-hud"><div><small>NIVEL</small><strong>{hud.level}/15</strong></div><div><small>PUNTOS</small><strong>{hud.score}</strong></div><div><small>VIDAS</small><strong>{hud.lives}</strong></div></div>
    <div className="canvas-engine-wrap" ref={wrapRef}><canvas ref={canvasRef} onPointerDown={aim} aria-label="Bola verde, obstáculos dorados y enemigos rojos" /></div>
    <p className="balls-engine-help">Toca el campo para impulsar la bola.</p>
  </GameViewport>;
}
