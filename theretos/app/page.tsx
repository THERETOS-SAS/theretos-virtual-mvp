import Image from "next/image";
import Link from "next/link";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import {
  IconArrow,
  IconGamepad,
  IconGift,
  IconGlobe,
  IconRunner,
  IconShield,
  IconTrophy,
} from "../components/icons";
import { MobileNavigation } from "../components/MobileNavigation";
import { HomeSessionActions } from "../components/HomeSessionActions";

export default function Home() {
  return (
    <main className="site-shell">
      <Header active="home" />

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow hero-glow-purple"></div>
        <div className="hero-glow hero-glow-green"></div>

        <div className="hero-copy">
          <span className="eyebrow">ECOSISTEMA THERETOS</span>

          <h1>
            JUEGA.
            <br />
            <span className="green">COMPITE.</span>
            <br />
            <span className="gradient-text">GANA.</span>
          </h1>

          <p>
            Una nueva forma de competir, superar tus habilidades y convertir
            cada reto en una experiencia.
          </p>

          <HomeSessionActions />
        </div>

        <div className="hero-art">
          <div className="hero-art-frame">
            <Image
              src="/brand/hero-theretos-etickets.png"
              alt="THERETOS, eTickets y ecosistema de juegos"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 52vw"
            />
            <div className="hero-art-overlay"></div>
          </div>

          <div className="floating-badge badge-one">
            <span className="badge-icon gold">
              <IconTrophy />
            </span>
            <div>
              <small>COMPITE</small>
              <strong>Torneos</strong>
            </div>
          </div>

          <div className="floating-badge badge-two">
            <span className="badge-icon purple">
              <IconGift />
            </span>
            <div>
              <small>DISFRUTA</small>
              <strong>Premios</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ECOSISTEMA */}
      <section className="ecosystem-section" id="ecosistema">
        <div className="section-heading">
          <span>ELIGE TU EXPERIENCIA</span>
          <h2>Un ecosistema. Dos formas de jugar.</h2>
          <p>
            THERETOS conecta el mundo físico y virtual bajo una misma
            experiencia.
          </p>
        </div>

        <div className="experience-grid">
          {/* FISICOS */}
          <article className="experience-card physical-card">
            <div className="card-glow"></div>

            <div className="experience-icon physical-icon">
              <IconRunner />
            </div>

            <div className="experience-copy">
              <span className="card-label">EN EL MUNDO REAL</span>
              <h3>
                THERETOS
                <br />
                <strong>FÍSICOS</strong>
              </h3>

              <p>
                Supera desafíos, compite y disfruta experiencias desde la app
                de THERETOS Físicos.
              </p>
            </div>

            <div className="experience-footer">
              <Link href="/physical" className="card-button physical-button">
                Conocer más
                <IconArrow />
              </Link>

              <span className="availability">Disponible en Google Play</span>
            </div>
          </article>

          {/* VIRTUAL */}
          <article className="experience-card virtual-card">
            <div className="card-glow"></div>

            <div className="experience-icon virtual-icon">
              <IconGamepad />
            </div>

            <div className="experience-copy">
              <span className="card-label">JUEGA DESDE CUALQUIER LUGAR</span>

              <h3>
                THERETOS
                <br />
                <strong>VIRTUALES</strong>
              </h3>

              <p>
                Practica gratis y, con tu cuenta, guarda XP y participa en
                torneos usando eTickets.
              </p>
            </div>

            <div className="experience-footer">
              <Link href="/virtual" className="card-button virtual-button">
                Jugar ahora
                <IconArrow />
              </Link>

              <span className="availability">Acceso desde la web</span>
            </div>
          </article>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="benefits-section">
        <div className="benefit">
          <span className="benefit-icon gold">
            <IconTrophy />
          </span>
          <div>
            <strong>Torneos</strong>
            <small>Demuestra tu habilidad</small>
          </div>
        </div>

        <div className="benefit">
          <span className="benefit-icon purple">
            <IconGift />
          </span>
          <div>
            <strong>Premios</strong>
            <small>Canjea tus eTickets</small>
          </div>
        </div>

        <div className="benefit">
          <span className="benefit-icon green">
            <IconShield />
          </span>
          <div>
            <strong>Juego justo</strong>
            <small>Competencia transparente</small>
          </div>
        </div>

        <div className="benefit">
          <span className="benefit-icon blue">
            <IconGlobe />
          </span>
          <div>
            <strong>Comunidad</strong>
            <small>Conectados por el juego</small>
          </div>
        </div>
      </section>

      {/* GOOGLE PLAY */}
      <section className="download-section">
        <div className="download-icon">
          <IconRunner />
        </div>

        <div className="download-copy">
          <span>THERETOS FÍSICOS</span>
          <h2>Lleva los retos contigo.</h2>
          <p>
            Descarga la aplicación y descubre la experiencia física de
            THERETOS.
          </p>
        </div>

        <Link href="/physical" className="google-play-button">
          <span className="play-triangle" aria-hidden="true"></span>

          <span>
            <small>DISPONIBLE EN</small>
            <strong>Google Play</strong>
          </span>
        </Link>
      </section>

      {/* TRUST */}
      <section className="trust-section">
        <article>
          <span>
            <IconShield />
          </span>
          <strong>Juego justo</strong>
          <p>La habilidad es protagonista.</p>
        </article>

        <article>
          <span>
            <IconShield />
          </span>
          <strong>Seguridad</strong>
          <p>Protección de cuenta y datos.</p>
        </article>

        <article>
          <span>
            <IconTrophy />
          </span>
          <strong>Competencia</strong>
          <p>Retos físicos y virtuales.</p>
        </article>

        <article>
          <span>
            <IconGlobe />
          </span>
          <strong>Global</strong>
          <p>Diseñado para crecer contigo.</p>
        </article>
      </section>

      <Footer />
      <MobileNavigation active="home" gamesHref="/virtual" />
    </main>
  );
}
