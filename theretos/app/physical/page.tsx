import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import {
  IconArrow,
  IconCheckCircle,
  IconDownload,
  IconGamepad,
  IconMapPin,
  IconProgress,
  IconRunner,
  IconShield,
  IconUsers,
} from "../../components/icons";
import { MobileNavigation } from "../../components/MobileNavigation";

export const metadata: Metadata = {
  title: "THERETOS Físicos | Retos en el mundo real",
  description:
    "Descubre retos y experiencias en el mundo real con la aplicación THERETOS Físicos para Android.",
};

// TODO: Reemplazar cuando esté disponible la URL oficial de Google Play.
const GOOGLE_PLAY_URL = "#";

const steps = [
  {
    number: "01",
    title: "Descarga",
    description: "Instala THERETOS desde Google Play.",
    Icon: IconDownload,
  },
  {
    number: "02",
    title: "Encuentra un reto",
    description: "Descubre desafíos físicos disponibles.",
    Icon: IconMapPin,
  },
  {
    number: "03",
    title: "Participa",
    description: "Completa el reto y registra tu experiencia.",
    Icon: IconCheckCircle,
  },
] as const;

const benefits = [
  {
    title: "Retos reales",
    description: "Experiencias fuera de la pantalla.",
    Icon: IconRunner,
  },
  {
    title: "Comunidad",
    description: "Conecta con otros participantes.",
    Icon: IconUsers,
  },
  {
    title: "Progresión",
    description: "Supera nuevas metas.",
    Icon: IconProgress,
  },
  {
    title: "Juego justo",
    description: "Experiencias basadas en reglas claras.",
    Icon: IconShield,
  },
] as const;

function GooglePlayButton({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href={GOOGLE_PLAY_URL}
      className={`physical-play-button${compact ? " physical-play-button-compact" : ""}`}
      aria-label="Descargar THERETOS Físicos en Google Play"
    >
      <span className="play-triangle" aria-hidden="true"></span>
      <span>
        <small>{compact ? "DESCARGA EN" : "DESCARGAR EN"}</small>
        <strong>Google Play</strong>
      </span>
    </Link>
  );
}

export default function PhysicalPage() {
  return (
    <main className="site-shell physical-page">
      <Header active="physical" />

      <div className="physical-content">
        <nav className="physical-breadcrumb" aria-label="Migas de pan">
          <Link href="/">Inicio</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">THERETOS Físicos</span>
        </nav>

        <section className="physical-hero" aria-labelledby="physical-title">
          <div className="physical-hero-copy">
            <span className="eyebrow physical-eyebrow">THERETOS FÍSICOS</span>
            <h1 id="physical-title">
              RETOS REALES.
              <br />
              <span>EXPERIENCIAS REALES.</span>
            </h1>
            <p>
              Supera desafíos en el mundo real y vive la experiencia THERETOS
              desde tu celular.
            </p>
            <div className="physical-hero-action">
              <GooglePlayButton />
              <small>Disponible para Android.</small>
            </div>
          </div>

          <div className="physical-hero-visual" aria-hidden="true">
            <span className="physical-orbit physical-orbit-one"></span>
            <span className="physical-orbit physical-orbit-two"></span>
            <span className="physical-hero-icon"><IconRunner /></span>
            <span className="physical-visual-label">MUÉVETE · SUPÉRATE</span>
          </div>
        </section>

        <section className="physical-section" aria-labelledby="steps-title">
          <div className="physical-section-heading">
            <span>CÓMO FUNCIONA</span>
            <h2 id="steps-title">Así de simple</h2>
          </div>
          <div className="physical-steps">
            {steps.map(({ number, title, description, Icon }) => (
              <article className="physical-step" key={number}>
                <span className="physical-step-number">{number}</span>
                <span className="physical-step-icon"><Icon /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="physical-section" aria-labelledby="benefits-title">
          <div className="physical-section-heading">
            <span>VIVE LA EXPERIENCIA</span>
            <h2 id="benefits-title">Más que un reto.</h2>
          </div>
          <div className="physical-benefits">
            {benefits.map(({ title, description, Icon }) => (
              <article className="physical-benefit" key={title}>
                <span><Icon /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="physical-download" aria-labelledby="download-title">
          <div>
            <span>THERETOS FÍSICOS</span>
            <h2 id="download-title">Tu próxima experiencia comienza aquí.</h2>
            <p>
              Descarga THERETOS Físicos y empieza a descubrir nuevos retos.
            </p>
          </div>
          <GooglePlayButton compact />
        </section>

        <aside className="physical-virtual" aria-labelledby="virtual-title">
          <span className="physical-virtual-icon"><IconGamepad /></span>
          <div>
            <small>¿PREFIERES JUGAR DESDE LA WEB?</small>
            <h2 id="virtual-title">THERETOS Virtuales</h2>
          </div>
          <Link href="/virtual">
            Jugar ahora
            <IconArrow />
          </Link>
        </aside>
      </div>

      <Footer />
      <MobileNavigation gamesHref="/virtual" />
    </main>
  );
}
