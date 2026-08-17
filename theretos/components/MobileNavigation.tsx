"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import {
  IconGamepad,
  IconGift,
  IconHome,
  IconTrophy,
  IconUser,
} from "./icons";

type MobileNavigationProps = {
  active?: "home" | "tournaments" | "games" | "marketplace" | "profile";
  gamesHref?: "/virtual";
};

export function MobileNavigation({ active, gamesHref = "/virtual" }: MobileNavigationProps) {
  const { isAuthenticated } = useAuth();
  const links = [
    { href: "/", label: "Inicio", key: "home", Icon: IconHome },
    { href: "/tournaments", label: "Torneos", key: "tournaments", Icon: IconTrophy },
    { href: gamesHref, label: "Juegos", key: "games", Icon: IconGamepad },
    { href: "/marketplace", label: "Premios", key: "marketplace", Icon: IconGift },
    { href: isAuthenticated ? "/profile" : "/login?returnTo=%2Fprofile", label: "Perfil", key: "profile", Icon: IconUser },
  ] as const;

  return (
    <nav className="mobile-nav" aria-label="Navegación móvil">
      {links.map(({ href, label, key, Icon }) => (
        <Link
          href={href}
          className={active === key ? "mobile-nav-active" : undefined}
          aria-current={active === key ? "page" : undefined}
          key={href}
        >
          <span><Icon /></span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
