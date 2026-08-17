import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <div className="footer-logo">
          <Image
            src="/brand/logo-theretos-header.png"
            alt="THERETOS"
            fill
            sizes="180px"
          />
        </div>
      </div>

      <div className="footer-links">
        <Link href="/about">Sobre nosotros</Link>
        <Link href="/support">Soporte</Link>
        <Link href="/terms">Términos</Link>
        <Link href="/privacy">Privacidad</Link>
      </div>

      <p className="copyright">© 2026 THERETOS. Todos los derechos reservados.</p>
    </footer>
  );
}
