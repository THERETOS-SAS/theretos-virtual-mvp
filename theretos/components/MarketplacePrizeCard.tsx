import Link from "next/link";
import type { MarketplaceAward } from "../lib/marketplace/types";
import { IconArrow, IconCoins } from "./icons";
import { MarketplaceAwardImage } from "./MarketplaceAwardImage";
import { RequireAuthAction } from "./RequireAuthAction";

type Props = {
  prize: MarketplaceAward;
  playerBalance: number;
  isAuthenticated: boolean;
  onRedeem: (prize: MarketplaceAward) => void;
};

export function MarketplacePrizeCard({ prize, playerBalance, isAuthenticated, onRedeem }: Props) {
  const remainingEtickets = Math.max(prize.etickets - playerBalance, 0);
  const progress = prize.etickets > 0 ? Math.min((playerBalance / prize.etickets) * 100, 100) : 0;
  const canRedeem = prize.redeemable && remainingEtickets === 0;
  const available = prize.stock > 0 && prize.etickets > 0;

  return (
    <article className="marketplace-prize-card">
      <div className="marketplace-prize-art"><MarketplaceAwardImage imageUrl={prize.imageUrl} name={prize.name} /></div>
      <div className="marketplace-prize-meta"><span>{prize.categoryName}</span><em className={available ? undefined : "sold-out"}>{available ? "Disponible" : "Agotado"}</em></div>
      <h3>{prize.name}</h3>
      <strong className="marketplace-prize-cost"><IconCoins /> {prize.etickets > 0 ? `${prize.etickets.toLocaleString("es-CO")} eTickets` : "No disponible"}</strong>
      {isAuthenticated ? <><div className="marketplace-prize-progress">
        <div><span>Tu progreso</span><strong>{playerBalance} / {prize.etickets > 0 ? prize.etickets.toLocaleString("es-CO") : "—"}</strong></div>
        <span className="marketplace-progress-track"><span style={{ width: `${progress}%` }} /></span>
      </div>
      <div className={`marketplace-eligibility${canRedeem ? " can-redeem" : ""}`}>
        <small>{canRedeem ? "Puedes canjearlo" : available ? "Te faltan" : "No disponible"}</small>
        {!canRedeem && available && <strong>{remainingEtickets.toLocaleString("es-CO")} eTickets</strong>}
      </div>
      {canRedeem ? (
        <button type="button" onClick={() => onRedeem(prize)}>Canjear <IconArrow /></button>
      ) : available ? (
        <div className="marketplace-prize-actions"><Link href="/tournaments">Seguir compitiendo</Link><Link href="/etickets">Conseguir eTickets</Link></div>
      ) : (
        <button type="button" disabled>Agotado</button>
      )}</> : <div className="marketplace-guest-action"><span>{prize.etickets.toLocaleString("es-CO")} eTickets para canjear</span><RequireAuthAction returnUrl="/marketplace" message="Inicia sesión o crea tu cuenta para consultar tu saldo y canjear premios.">Iniciar sesión para canjear</RequireAuthAction></div>}
    </article>
  );
}
