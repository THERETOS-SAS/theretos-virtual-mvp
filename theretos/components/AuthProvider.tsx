"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { mockPlayer } from "../data/mockAccount";
import { mockTournaments, type MockTournament } from "../data/mockTournaments";
import { mockHistory, type HistoryEntry } from "../data/mockHistory";
import { usePathname, useRouter } from "next/navigation";
import type { GameResult } from "../types/games";

const SESSION_KEY = "theretos_demo_session";
const PLAYER_KEY = "theretos_player_v1";
const TOURNAMENTS_KEY = "theretos_tournaments_v1";
const HISTORY_KEY = "theretos_history_v1";
const WELCOME_BONUS_KEY = "theretos_welcome_bonus_v1";
export type DemoPlayer = { [Key in keyof typeof mockPlayer]: (typeof mockPlayer)[Key] extends number ? number : string };
type ProfileUpdate = Partial<Pick<DemoPlayer, "name" | "firstName" | "lastName" | "email" | "phone">>;
type ParticipationResult = { status: "success"; tournament: MockTournament; participation: HistoryEntry; newBalance: number } | { status: "full" | "insufficient" | "unavailable" };
type AttemptResult = { status: "success"; participation: HistoryEntry } | { status: "invalid" | "already-completed" };
type AuthContextValue = { isAuthenticated: boolean; isReady: boolean; user: DemoPlayer | null; tournaments: MockTournament[]; history: HistoryEntry[]; login: () => void; loginDemo: () => void; logout: () => void; register: (profile?: ProfileUpdate) => void; signupDemo: (profile?: ProfileUpdate) => void; updateProfile: (profile: ProfileUpdate) => void; participate: (tournamentId: string) => ParticipationResult; startTournamentAttempt: (participationId: string) => AttemptResult; completeTournamentAttempt: (participationId: string, result: GameResult) => AttemptResult; recordPracticeResult: (gameName: string, result: GameResult) => void };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isReady, setReady] = useState(false);
  const [player, setPlayer] = useState<DemoPlayer>({ ...mockPlayer });
  const [tournaments, setTournaments] = useState<MockTournament[]>(mockTournaments);
  const [history, setHistory] = useState<HistoryEntry[]>(mockHistory);
  const playerRef = useRef(player);
  const tournamentsRef = useRef(tournaments);
  const historyRef = useRef(history);
  const participatingRef = useRef(false);
  const activate = useCallback(() => { localStorage.setItem(SESSION_KEY, "active"); setAuthenticated(true); }, []);
  const logout = useCallback(() => { localStorage.removeItem(SESSION_KEY); localStorage.removeItem("theretos-auth-session"); setAuthenticated(false); }, []);
  const updateProfile = useCallback((profile: ProfileUpdate) => { const updated = { ...playerRef.current, ...profile }; playerRef.current = updated; setPlayer(updated); localStorage.setItem(PLAYER_KEY, JSON.stringify(updated)); }, []);
  const register = useCallback((profile: ProfileUpdate = {}) => { let updated = { ...playerRef.current, ...profile }; if (!localStorage.getItem(WELCOME_BONUS_KEY)) { updated = { ...updated, etickets: updated.etickets + updated.welcomeBonusEtickets }; localStorage.setItem(WELCOME_BONUS_KEY, "granted"); } playerRef.current = updated; setPlayer(updated); localStorage.setItem(PLAYER_KEY, JSON.stringify(updated)); activate(); }, [activate]);
  useEffect(() => { const timer = window.setTimeout(() => {
    const read = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
    const savedPlayer = { ...mockPlayer, ...read<Partial<DemoPlayer>>(PLAYER_KEY, {}) } as DemoPlayer;
    const storedTournaments = read<MockTournament[]>(TOURNAMENTS_KEY, mockTournaments);
    const savedTournaments = mockTournaments.map((canonical) => { const stored = storedTournaments.find((item) => item.id === canonical.id); return stored ? { ...stored, name: canonical.name, slug: canonical.slug, gameSlug: canonical.gameSlug, gameName: canonical.gameName, entryCost: canonical.entryCost, maxPlayers: canonical.maxPlayers } : canonical; });
    const savedHistory = read<HistoryEntry[]>(HISTORY_KEY, mockHistory).map((item) => item.status === ("participating" as HistoryEntry["status"]) ? { ...item, status: "pending" as const } : item);
    playerRef.current = savedPlayer; tournamentsRef.current = savedTournaments; historyRef.current = savedHistory;
    setPlayer(savedPlayer); setTournaments(savedTournaments); setHistory(savedHistory);
    setAuthenticated(localStorage.getItem(SESSION_KEY) === "active"); setReady(true);
  }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (!isReady) return; document.body.dataset.auth = isAuthenticated ? "user" : "guest"; if (!isAuthenticated && ["/profile", "/my-prizes", "/history"].includes(pathname)) router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`); }, [isAuthenticated, isReady, pathname, router]);
  useEffect(() => { const handleLogout = (event: MouseEvent) => { const link = (event.target as Element).closest<HTMLAnchorElement>('.profile-security-grid a[href="/"]'); if (!link) return; event.preventDefault(); logout(); router.push("/"); }; document.addEventListener("click", handleLogout); return () => document.removeEventListener("click", handleLogout); }, [logout, router]);
  const participate = useCallback((tournamentId: string): ParticipationResult => {
    if (participatingRef.current) return { status: "unavailable" };
    const tournament = tournamentsRef.current.find((item) => item.id === tournamentId);
    if (!tournament || tournament.status === "upcoming") return { status: "unavailable" };
    if (tournament.participants >= tournament.maxPlayers) return { status: "full" };
    if (playerRef.current.etickets < tournament.entryCost) return { status: "insufficient" };
    participatingRef.current = true;
    const updatedTournament = { ...tournament, participants: tournament.participants + 1 };
    const updatedTournaments = tournamentsRef.current.map((item) => item.id === tournamentId ? updatedTournament : item);
    const updatedPlayer = { ...playerRef.current, etickets: playerRef.current.etickets - tournament.entryCost };
    const now = new Date();
    const entry: HistoryEntry = { id: `participation-${now.getTime()}`, type: "tournament", tournamentId: tournament.id, tournament: tournament.name, tournamentName: tournament.name, game: tournament.gameName, gameName: tournament.gameName, gameSlug: tournament.gameSlug, date: new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(now), createdAt: now.toISOString(), entryCost: tournament.entryCost, status: "pending" };
    const updatedHistory = [entry, ...historyRef.current];
    playerRef.current = updatedPlayer; tournamentsRef.current = updatedTournaments; historyRef.current = updatedHistory;
    setPlayer(updatedPlayer); setTournaments(updatedTournaments); setHistory(updatedHistory);
    localStorage.setItem(PLAYER_KEY, JSON.stringify(updatedPlayer));
    localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(updatedTournaments));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    window.setTimeout(() => { participatingRef.current = false; }, 400);
    return { status: "success", tournament: updatedTournament, participation: entry, newBalance: updatedPlayer.etickets };
  }, []);
  const updateAttempt = useCallback((participationId: string, action: "start" | "complete", gameResult?: GameResult): AttemptResult => {
    const participation = historyRef.current.find((item) => item.id === participationId && item.type === "tournament");
    if (!participation || !participation.gameSlug || !participation.tournamentId) return { status: "invalid" };
    if (participation.status === "completed") return { status: "already-completed" };
    if (action === "complete" && (participation.status !== "playing" || !gameResult || gameResult.gameSlug !== participation.gameSlug || !gameResult.completed)) return { status: "invalid" };
    if (action === "start" && participation.status !== "pending") return { status: "invalid" };
    const now = new Date();
    const updated: HistoryEntry = action === "start"
      ? { ...participation, status: "playing", startedAt: now.toISOString() }
      : { ...participation, status: "completed", completedAt: now.toISOString(), date: new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(now), score: gameResult!.score, durationMs: gameResult!.durationMs, metrics: gameResult!.metrics };
    const updatedHistory = historyRef.current.map((item) => item.id === participationId ? updated : item);
    historyRef.current = updatedHistory;
    setHistory(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    return { status: "success", participation: updated };
  }, []);
  const startTournamentAttempt = useCallback((participationId: string) => updateAttempt(participationId, "start"), [updateAttempt]);
  const completeTournamentAttempt = useCallback((participationId: string, result: GameResult) => updateAttempt(participationId, "complete", result), [updateAttempt]);
  const recordPracticeResult = useCallback((gameName: string, result: GameResult) => {
    if (!isAuthenticated || !result.completed) return;
    const now = new Date();
    const entry: HistoryEntry = { id: `practice-${now.getTime()}`, type: "practice", game: gameName, gameName, gameSlug: result.gameSlug, score: result.score, date: new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(now), createdAt: now.toISOString(), completedAt: now.toISOString(), status: "completed", durationMs: result.durationMs, metrics: result.metrics };
    const updatedHistory = [entry, ...historyRef.current]; historyRef.current = updatedHistory; setHistory(updatedHistory); localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  }, [isAuthenticated]);
  const value = useMemo(() => ({ isAuthenticated, isReady, user: isAuthenticated ? player : null, tournaments, history, login: activate, loginDemo: activate, register, signupDemo: register, updateProfile, logout, participate, startTournamentAttempt, completeTournamentAttempt, recordPracticeResult }), [activate, completeTournamentAttempt, history, isAuthenticated, isReady, logout, participate, player, recordPracticeResult, register, startTournamentAttempt, tournaments, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
export function safeReturnUrl(value: string | null, fallback = "/profile") { return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback; }
