import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { IconArrow, IconCoins, IconGift, IconStore, IconTrophy } from "../../components/icons";
import { MarketplaceCatalog } from "../../components/MarketplaceCatalog";
import { MarketplaceAccount } from "../../components/MarketplaceAccount";
import { MobileNavigation } from "../../components/MobileNavigation";

export const metadata: Metadata = {
  title: "Premios | Marketplace THERETOS",
  description: "Explora recompensas y consulta cuántos eTickets necesitas para canjearlas en THERETOS.",
};

const steps = [
  { number: "01", title: "Compite", description: "Participa en torneos y aumenta tu saldo de eTickets.", Icon: IconTrophy },
  { number: "02", title: "Acumula", description: "Tus eTickets permanecen en tu saldo hasta que decidas utilizarlos.", Icon: IconCoins },
  { number: "03", title: "Elige", description: "Explora el Marketplace y encuentra la recompensa que quieres alcanzar.", Icon: IconStore },
  { number: "04", title: "Canjea", description: "Cuando tengas los eTickets necesarios, podrás solicitar tu premio.", Icon: IconGift },
] as const;

export default function MarketplacePage() {
  return (
    <main className="site-shell marketplace-page">
      <Header />
      <div className="marketplace-content">
        <nav className="marketplace-breadcrumb" aria-label="Migas de pan"><Link href="/">Inicio</Link><span aria-hidden="true">›</span><span aria-current="page">Premios</span></nav>

        <section className="marketplace-hero" aria-labelledby="marketplace-title">
          <div className="marketplace-hero-copy"><span className="eyebrow">MARKETPLACE THERETOS</span><h1 id="marketplace-title">JUEGA.<br /><span>ACUMULA.</span><br /><em>CANJEA.</em></h1><p>Convierte tu progreso en recompensas. Acumula eTickets compitiendo y descubre los premios disponibles en THERETOS.</p></div>
          <MarketplaceAccount />
        </section>

        <section className="marketplace-catalog" aria-labelledby="catalog-title"><div className="marketplace-section-heading"><span>DESCUBRE</span><h2 id="catalog-title">Premios disponibles</h2></div><MarketplaceCatalog /></section>

        <section className="marketplace-how" aria-labelledby="marketplace-how-title"><div className="marketplace-section-heading"><span>CANJEA EN THERETOS</span><h2 id="marketplace-how-title">¿Cómo funciona?</h2></div><div className="marketplace-how-grid">{steps.map(({ number, title, description, Icon }) => <article key={number}><span>{number}</span><i><Icon /></i><h3>{title}</h3><p>{description}</p></article>)}</div></section>

        <aside className="marketplace-notice"><IconGift /><div><h2>Sobre los premios</h2><p>Los premios y recompensas están sujetos a disponibilidad, condiciones de canje y términos aplicables.</p></div></aside>

        <section className="marketplace-final-cta"><div><span>TU PRÓXIMO PREMIO EMPIEZA EN EL JUEGO</span><h2>Sigue compitiendo y mejora tus resultados.</h2><p>Aumenta tu saldo y continúa acercándote a tu próxima recompensa.</p></div><div><Link href="/tournaments">Ver torneos <IconTrophy /><IconArrow /></Link><Link href="/etickets">Recargar eTickets <IconCoins /><IconArrow /></Link></div></section>
      </div>
      <Footer />
      <MobileNavigation active="marketplace" gamesHref="/virtual" />
    </main>
  );
}
