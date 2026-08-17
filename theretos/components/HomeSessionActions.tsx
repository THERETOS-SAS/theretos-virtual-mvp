"use client";

import Link from "next/link";
import { IconArrow } from "./icons";
import { useAuth } from "./AuthProvider";

export function HomeSessionActions() {
  const { isAuthenticated } = useAuth();
  return <div className="hero-actions"><Link href={isAuthenticated ? "/virtual" : "#ecosistema"} className="button button-primary">{isAuthenticated ? "Seguir jugando" : "Explorar THERETOS"}<span className="button-icon"><IconArrow /></span></Link><Link href={isAuthenticated ? "/profile" : "/login"} className="button button-secondary">{isAuthenticated ? "Mi perfil" : "Iniciar sesión"}</Link></div>;
}
