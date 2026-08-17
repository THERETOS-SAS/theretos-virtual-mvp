import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { IconArrow, IconCoins, IconProgress, IconTrophy } from "../../components/icons";
import { MobileNavigation } from "../../components/MobileNavigation";
import { TournamentList } from "../../components/TournamentList";
import { TournamentBalance } from "../../components/TournamentLiveSections";

export const metadata: Metadata = {
  title: "Torneos | THERETOS Virtual",
  description: "Usa tus eTickets para entrar a torneos de habilidad y competir por los mejores resultados.",
};

export default function TournamentsPage() {
  return (
    <main className="site-shell tournaments-page">
      <Header />

      <div className="tournaments-content">
        <nav className="tournaments-breadcrumb" aria-label="Migas de pan">
          <Link href="/">Inicio</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Torneos</span>
        </nav>

        <section className="tournaments-hero tournaments-hero-compact" aria-labelledby="tournaments-title">
          <div className="tournaments-hero-copy">
            <span className="eyebrow tournaments-eyebrow">THERETOS VIRTUAL</span>
            <h1 id="tournaments-title">
              COMPITE.
              <br />
              <span className="tournaments-title-gold">SUPÉRATE.</span>
              <br />
              <span className="tournaments-title-gradient">GANA.</span>
            </h1>
            <p>1 eTicket por intento · El mejor puntaje gana el pozo</p>
          </div>
          <TournamentBalance />
        </section>

        <section className="tournaments-list-section tournaments-list-priority" aria-labelledby="available-title">
          <div className="tournaments-section-heading">
            <span>ELIGE Y COMPITE</span>
            <h2 id="available-title">Torneos</h2>
          </div>
          <TournamentList />
        </section>

        <section className="tournaments-how-compact" aria-label="Cómo funcionan los torneos">
          <div className="tournaments-flow-strip">
            <span><IconCoins /><strong>1 eTicket</strong></span>
            <IconArrow />
            <span><IconProgress /><strong>Juega</strong></span>
            <IconArrow />
            <span><IconTrophy /><strong>Mejor puntuación</strong></span>
            <IconArrow />
            <span><IconTrophy /><strong>Gana el pozo</strong></span>
          </div>
          <details className="tournaments-how-details">
            <summary>¿Cómo funcionan los torneos?</summary>
            <div>
              <p>Cada participación cuesta 1 eTicket, crea un intento nuevo y suma 1 eTicket al pozo.</p>
              <p>Puedes participar de nuevo mientras tengas saldo. La clasificación depende de tu puntuación y de las reglas del torneo.</p>
            </div>
          </details>
        </section>
      </div>

      <Footer />
      <MobileNavigation active="tournaments" gamesHref="/virtual" />
    </main>
  );
}

