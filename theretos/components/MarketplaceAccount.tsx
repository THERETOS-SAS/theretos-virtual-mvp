"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { GuestAccountCard } from "./AuthUX";
import { IconArrow, IconCoins } from "./icons";
export function MarketplaceAccount() { const { isAuthenticated, user } = useAuth(); if (!isAuthenticated || !user) return <GuestAccountCard returnUrl="/marketplace" text="Inicia sesión o crea tu cuenta para consultar tus eTickets y canjear recompensas." />; return <aside className="marketplace-balance" aria-label="Saldo del jugador"><div><small>SALDO DISPONIBLE</small><strong>{user.name}</strong><span>NV. {user.level}</span></div><p><IconCoins /><strong>{user.etickets}</strong><span>eTickets</span></p><div><Link href="/tournaments">Ver torneos <IconArrow /></Link><Link href="/etickets">Conseguir más eTickets <IconArrow /></Link></div></aside>; }
