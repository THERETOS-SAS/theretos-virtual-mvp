import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { IconArrow, IconGamepad, IconProgress, IconTrophy } from "../../components/icons";
import { MobileNavigation } from "../../components/MobileNavigation";
import { RankingBoard } from "../../components/RankingBoard";

export const metadata: Metadata = { title: "Ranking | THERETOS", description: "Compara tu progreso y escala posiciones en THERETOS Virtual." };

const steps = [
  { number: "01", title: "Practica", text: "Mejora tus marcas y domina cada reto.", Icon: IconGamepad },
  { number: "02", title: "Compite", text: "Participa en torneos y demuestra tu habilidad.", Icon: IconTrophy },
  { number: "03", title: "Acumula XP", text: "Tus resultados con cuenta aumentan tu progreso.", Icon: IconProgress },
] as const;

export default function RankingPage() {
  return <main className="site-shell ranking-page"><Header active="virtual" /><div className="ranking-content"><nav className="ranking-breadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>›</span><span aria-current="page">Ranking</span></nav><section className="ranking-hero"><span className="eyebrow ranking-eyebrow">RANKING THERETOS</span><h1>MIDE TU NIVEL.<br /><em>SUPERA TU MARCA.</em></h1><p>Compara tu progreso con otros jugadores, supera tus mejores resultados y escala posiciones en THERETOS.</p></section><RankingBoard /><section className="ranking-how" aria-labelledby="ranking-how-title"><div className="ranking-section-heading"><span>MEJORA TU POSICIÓN</span><h2 id="ranking-how-title">¿CÓMO SUBIR EN EL RANKING?</h2></div><div className="ranking-how-grid">{steps.map(({ number, title, text, Icon }) => <article key={number}><span>{number}</span><i><Icon /></i><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section><section className="ranking-final-cta"><div><span>CONTINÚA TU PROGRESO</span><h2>TU PRÓXIMA POSICIÓN SE GANA JUGANDO.</h2><p>Supera tu marca, escala posiciones y continúa construyendo tu historia en THERETOS.</p></div><div><Link href="/virtual">Jugar ahora <IconArrow /></Link><Link href="/history">Ver mi historial <IconArrow /></Link></div></section></div><Footer /><MobileNavigation active="games" gamesHref="/virtual" /></main>;
}
