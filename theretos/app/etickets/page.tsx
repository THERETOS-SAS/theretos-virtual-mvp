import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { IconArrow, IconProgress } from "../../components/icons";
import { MobileNavigation } from "../../components/MobileNavigation";
import { RechargeSelector } from "../../components/RechargeSelector";
import { ETicketsBalanceCard } from "../../components/PlayerLiveCards";

export const metadata: Metadata = {
  title: "eTickets | THERETOS",
  description: "Consulta tu saldo y elige paquetes de recarga de eTickets en THERETOS.",
};

const questions = [
  ["¿Qué son los eTickets?", "Son créditos internos utilizados dentro del ecosistema THERETOS."],
  ["¿Caducan?", "Las condiciones de vigencia estarán definidas en los términos aplicables de THERETOS."],
  ["¿Puedo usarlos en torneos?", "Sí. Cada torneo indica claramente el valor de entrada en eTickets."],
  ["¿Puedo canjearlos por premios?", "Sí. Los premios disponibles muestran la cantidad de eTickets necesarios para solicitar el canje."],
] as const;

export default function ETicketsPage() {
  return (
    <main className="site-shell etickets-page">
      <Header />
      <div className="etickets-content">
        <nav className="etickets-breadcrumb" aria-label="Migas de pan">
          <Link href="/">Inicio</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">eTickets</span>
        </nav>

        <section className="etickets-hero etickets-hero-compact" aria-labelledby="etickets-title">
          <div className="etickets-hero-copy">
            <span className="eyebrow etickets-eyebrow">ETICKETS THERETOS</span>
            <h1 id="etickets-title">RECARGA.<br /><span className="etickets-title-gold">COMPITE.</span><br /><span className="etickets-title-gradient">SIGUE JUGANDO.</span></h1>
            <p>Participa en torneos y canjea premios.</p>
          </div>
          <ETicketsBalanceCard />
        </section>

        <section className="etickets-section etickets-recharge-section" id="recargar" aria-labelledby="recharge-title">
          <div className="etickets-section-heading">
            <span>RECARGA</span>
            <h2 id="recharge-title">ELIGE TU PAQUETE</h2>
          </div>
          <RechargeSelector />
        </section>

        <nav className="etickets-prizes-link etickets-prizes-link-simple" aria-label="Acceso a premios">
          <Link href="/marketplace">Ver premios <IconArrow /></Link>
        </nav>

        <section className="etickets-faq etickets-faq-compact" aria-labelledby="etickets-faq-title">
          <div className="etickets-section-heading">
            <h2 id="etickets-faq-title">PREGUNTAS FRECUENTES</h2>
          </div>
          <div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<IconProgress /></summary><p>{answer}</p></details>)}</div>
        </section>
      </div>
      <Footer />
      <MobileNavigation gamesHref="/virtual" />
    </main>
  );
}
