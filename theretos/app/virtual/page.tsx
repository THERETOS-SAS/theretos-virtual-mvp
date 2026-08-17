import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { GameCard } from "../../components/GameCard";
import { Header } from "../../components/Header";
import { IconGamepad } from "../../components/icons";
import { MobileNavigation } from "../../components/MobileNavigation";
import { mockGames } from "../../data/mockGames";
import { VirtualGuestPrompt } from "../../components/VirtualPlayerPanel";

export const metadata: Metadata = {
  title: "THERETOS Virtual | Juega gratis",
  description: "Practica gratis, mejora tu habilidad y supera tu mejor marca.",
};

export default function VirtualPage() {
  return (
    <main className="site-shell virtual-page">
      <Header active="virtual" />

      <div className="virtual-content">
        <nav className="virtual-breadcrumb" aria-label="Migas de pan">
          <Link href="/">Inicio</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">THERETOS Virtual</span>
        </nav>

        <section className="virtual-hero virtual-hero-practice-only" aria-labelledby="virtual-title">
          <div className="virtual-hero-copy">
            <span className="eyebrow virtual-eyebrow">THERETOS VIRTUAL</span>
            <h1 id="virtual-title">
              JUEGA.
              <br />
              <span className="virtual-title-green">MEJORA.</span>
              <br />
              <span className="virtual-title-gradient">COMPITE.</span>
            </h1>
            <p>Practica gratis. Mejora tu récord.</p>
            <div className="virtual-hero-actions virtual-hero-actions-practice">
              <Link href="#games-title" className="virtual-hero-practice">
                <IconGamepad />
                <span><strong>Jugar gratis</strong><small>Elige un juego</small></span>
              </Link>
            </div>
          </div>
        </section>

        <section className="virtual-section virtual-games-section" aria-labelledby="games-title">
          <div className="virtual-section-heading">
            <span>PRÁCTICA GRATIS</span>
            <h2 id="games-title">Juegos</h2>
          </div>
          <div className="virtual-games-grid">
            {mockGames.map((game) => <GameCard {...game} key={game.slug} />)}
            <VirtualGuestPrompt />
          </div>
        </section>
      </div>

      <Footer />
      <MobileNavigation active="games" gamesHref="/virtual" />
    </main>
  );
}
