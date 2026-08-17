import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import {
  IconArrow,
  IconEye,
  IconGamepad,
  IconRunner,
  IconShield,
  IconStore,
  IconTarget,
  IconUsers,
} from "../../components/icons";
import { MobileNavigation } from "../../components/MobileNavigation";

export const metadata: Metadata = {
  title: "Sobre Nosotros | THERETOS",
  description:
    "Conoce la misión, visión y ecosistema de experiencias físicas y virtuales de THERETOS.",
};

const pillars = [
  {
    title: "Misión",
    description:
      "Crear experiencias de juego que conecten habilidad, competencia y entretenimiento.",
    className: "about-pillar-gold",
    Icon: IconTarget,
  },
  {
    title: "Visión",
    description:
      "Construir un ecosistema global de entretenimiento competitivo.",
    className: "about-pillar-purple",
    Icon: IconEye,
  },
  {
    title: "Juego justo",
    description:
      "Promover experiencias transparentes, seguras y basadas en habilidad.",
    className: "about-pillar-green",
    Icon: IconShield,
  },
  {
    title: "Comunidad",
    description:
      "Conectar jugadores mediante retos, competencia y experiencias compartidas.",
    className: "about-pillar-blue",
    Icon: IconUsers,
  },
] as const;

const experiences = [
  {
    title: "THERETOS Físicos",
    description: "Retos y experiencias en el mundo real.",
    label: "Conocer más",
    href: "/physical",
    className: "about-experience-green",
    Icon: IconRunner,
  },
  {
    title: "THERETOS Virtuales",
    description: "Juegos, práctica y torneos desde cualquier lugar.",
    label: "Jugar ahora",
    href: "/virtual",
    className: "about-experience-purple",
    Icon: IconGamepad,
  },
  {
    title: "Marketplace",
    description: "Canjea tus eTickets por premios y experiencias.",
    label: "Ver premios",
    href: "/marketplace",
    className: "about-experience-gold",
    Icon: IconStore,
  },
] as const;

export default function AboutPage() {
  return (
    <main className="site-shell about-page">
      <Header active="about" />

      <div className="about-content">
        <nav className="about-breadcrumb" aria-label="Migas de pan">
          <Link href="/">Inicio</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Sobre Nosotros</span>
        </nav>

        <section className="about-hero" aria-labelledby="about-title">
          <span className="eyebrow">CONOCE THERETOS</span>
          <h1 id="about-title">
            SOBRE
            <br />
            <span className="gradient-text">NOSOTROS</span>
          </h1>
          <p>
            THERETOS es un ecosistema que conecta experiencias físicas y
            virtuales donde la habilidad, la competencia y las recompensas se
            encuentran en un solo lugar.
          </p>
        </section>

        <section className="about-section" aria-labelledby="pillars-title">
          <div className="about-section-heading">
            <span>NUESTRA ESENCIA</span>
            <h2 id="pillars-title">Cuatro pilares. Una visión.</h2>
          </div>

          <div className="about-pillars">
            {pillars.map(({ title, description, className, Icon }) => (
              <article className={`about-pillar ${className}`} key={title}>
                <span className="about-pillar-icon"><Icon /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section" aria-labelledby="ecosystem-title">
          <div className="about-section-heading">
            <span>DESCUBRE</span>
            <h2 id="ecosystem-title">Nuestro ecosistema</h2>
          </div>

          <div className="about-experiences">
            {experiences.map(
              ({ title, description, label, href, className, Icon }) => (
                <article className={`about-experience ${className}`} key={title}>
                  <span className="about-experience-icon"><Icon /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <Link href={href}>
                    {label}
                    <IconArrow />
                  </Link>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="about-skill-competition" aria-labelledby="skill-competition-title">
          <span className="about-skill-icon"><IconTarget /></span>
          <div>
            <small>JUEGO JUSTO</small>
            <h2 id="skill-competition-title">Competencia basada en habilidad</h2>
            <p>Las experiencias competitivas de THERETOS están diseñadas para que el resultado dependa del desempeño del jugador: su habilidad, precisión, velocidad, memoria, estrategia u otras destrezas definidas para cada reto.</p>
            <p>Todos los participantes compiten bajo reglas previamente establecidas y condiciones definidas para cada competencia. Los ganadores se determinan por su desempeño y resultados, no mediante sorteos o mecanismos aleatorios destinados a seleccionar al ganador.</p>
            <small className="about-skill-note">Las condiciones específicas de participación, clasificación, uso de eTickets, premios y canjes se establecen en las reglas aplicables a cada competencia.</small>
          </div>
        </section>

        <section className="about-final-cta" aria-labelledby="about-cta-title">
          <div>
            <span>ELIGE TU EXPERIENCIA</span>
            <h2 id="about-cta-title">Dos formas de vivir THERETOS.</h2>
          </div>
          <div className="about-cta-actions">
            <Link href="/physical" className="about-cta-physical">
              THERETOS FÍSICOS
              <IconArrow />
            </Link>
            <Link href="/virtual" className="about-cta-virtual">
              THERETOS VIRTUALES
              <IconArrow />
            </Link>
          </div>
        </section>
      </div>

      <Footer />
      <MobileNavigation gamesHref="/virtual" />
    </main>
  );
}
