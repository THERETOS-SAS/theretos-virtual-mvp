"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

type HeaderProps = {
  active?: "home" | "about" | "virtual" | "physical" | "support";
};

const links = [
  { href: "/", label: "Inicio", key: "home" },
  { href: "/about", label: "Nosotros", key: "about" },
  { href: "/virtual", label: "Virtual", key: "virtual" },
  { href: "/physical", label: "Físicos", key: "physical" },
  { href: "/support", label: "Soporte", key: "support" },
] as const;

export function Header({ active }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  return (
    <header className="header">
      <Link href="/" className="brand" aria-label="THERETOS - Inicio">
        <div className="brand-image">
          <Image
            src="/brand/logo-theretos-header.png"
            alt="THERETOS"
            fill
            priority
            sizes="220px"
          />
        </div>
      </Link>

      <nav className="desktop-nav" aria-label="Navegación principal">
        {links.map((link) => (
          <Link
            href={link.href}
            className={active === link.key ? "active" : undefined}
            aria-current={active === link.key ? "page" : undefined}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <button className="language" type="button" aria-label="Cambiar idioma">
          <strong>ES</strong>
          <span></span>
          EN
        </button>

        <Link href={isAuthenticated ? "/profile" : "/login"} className="login-link">
          {isAuthenticated ? "Mi perfil" : "Ingresar"}
        </Link>
      </div>
    </header>
  );
}
