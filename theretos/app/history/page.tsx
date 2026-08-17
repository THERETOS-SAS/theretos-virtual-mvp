import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "../../components/BackLink";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { HistoryList } from "../../components/HistoryList";
import { HistorySummary } from "../../components/PlayerLiveCards";
import { IconProgress } from "../../components/icons";
import { MobileNavigation } from "../../components/MobileNavigation";

export const metadata: Metadata = { title: "Mi historial | THERETOS", description: "Consulta tus participaciones y mejores resultados." };

export default function HistoryPage() {
  return <main className="site-shell history-page"><Header /><div className="history-content"><nav className="history-breadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>›</span><Link href="/profile">Perfil</Link><span>›</span><span aria-current="page">Historial</span></nav><BackLink href="/profile" label="Mi perfil" /><section className="history-hero"><span className="eyebrow">MI ACTIVIDAD</span><h1>TU HISTORIA<br /><em>EN THERETOS.</em></h1><p>Consulta tus participaciones, mejores resultados y progreso.</p></section><HistorySummary /><section className="history-section" aria-labelledby="history-title"><div><span>RESULTADOS GUARDADOS</span><h2 id="history-title">Tu actividad</h2></div><HistoryList /></section><aside className="history-note"><IconProgress /><p>Las prácticas realizadas sin iniciar sesión no generan XP ni se guardan en tu historial.</p></aside></div><Footer /><MobileNavigation active="profile" /></main>;
}
