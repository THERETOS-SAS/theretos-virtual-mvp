import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "../../components/BackLink";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { IconProgress } from "../../components/icons";
import { MobileNavigation } from "../../components/MobileNavigation";
import { MyPrizesSummary } from "../../components/MyPrizesSummary";
import { RedemptionsList } from "../../components/RedemptionsList";

export const metadata: Metadata = { title: "Mis premios | THERETOS", description: "Consulta tus solicitudes de canje y el estado de tus premios THERETOS." };

export default function MyPrizesPage() {
  return <main className="site-shell my-prizes-page"><Header /><div className="my-prizes-content"><nav className="my-prizes-breadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>›</span><Link href="/profile">Perfil</Link><span>›</span><span aria-current="page">Mis premios</span></nav><BackLink href="/profile" label="Mi perfil" /><section className="my-prizes-hero"><span className="eyebrow">MIS RECOMPENSAS</span><h1>TUS PREMIOS.<br /><em>TU PROGRESO.</em></h1><p>Consulta los premios que has solicitado y sigue el estado de cada canje.</p></section><MyPrizesSummary /><section className="my-prizes-list" aria-labelledby="my-prizes-list-title"><div className="my-prizes-heading"><span>MI ACTIVIDAD</span><h2 id="my-prizes-list-title">MIS CANJES</h2><p><IconProgress /> Seguimiento visual de tus solicitudes y entregas.</p></div><RedemptionsList /></section></div><Footer /><MobileNavigation active="profile" /></main>;
}
