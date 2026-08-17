"use client";
import { useAuth } from "./AuthProvider";
import { GuestAccountCard } from "./AuthUX";
export function VirtualGuestState() { const { isAuthenticated } = useAuth(); return isAuthenticated ? null : <GuestAccountCard returnUrl="/virtual" title="Guarda tu progreso" text="Inicia sesión para acumular XP, conservar tus resultados y participar en torneos." />; }
export function TournamentsGuestState() { const { isAuthenticated } = useAuth(); return isAuthenticated ? null : <GuestAccountCard returnUrl="/tournaments" title="Inicia sesión para participar" text="Puedes consultar torneos y bolsas como visitante. Accede a tu cuenta cuando quieras competir." />; }
