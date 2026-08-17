"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { IconCoins } from "./icons";
import { useAuth } from "./AuthProvider";
import { RequireAuthAction } from "./RequireAuthAction";

export function TournamentParticipateButton({ tournamentId, className }: { tournamentId: string; className: string }) {
  const router = useRouter();
  const { isAuthenticated, user, tournaments, participate, startTournamentAttempt } = useAuth();
  const tournament = tournaments.find((item) => item.id === tournamentId);
  const [modal, setModal] = useState<"confirm" | "insufficient" | "full" | null>(null);
  const [processing, setProcessing] = useState(false);
  const submittedRef = useRef(false);

  if (!tournament) return null;

  const ticketLabel = tournament.entryCost === 1 ? "eTicket" : "eTickets";
  const cta = `Participar · ${tournament.entryCost} ${ticketLabel}`;

  if (!isAuthenticated) {
    return <RequireAuthAction returnUrl="/tournaments" className={className} message="Necesitas una cuenta THERETOS para participar en torneos, usar eTickets y guardar tus resultados.">{cta}</RequireAuthAction>;
  }

  const open = () => {
    if (tournament.participants >= tournament.maxPlayers) setModal("full");
    else if ((user?.etickets ?? 0) < tournament.entryCost) setModal("insufficient");
    else setModal("confirm");
  };

  const confirm = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setProcessing(true);
    const result = participate(tournament.id);

    if (result.status === "success") {
      const attempt = startTournamentAttempt(result.participation.id);
      if (attempt.status === "success") {
        router.push(`/games/${tournament.gameSlug}?mode=tournament&participation=${encodeURIComponent(result.participation.id)}`);
        return;
      }
    }

    submittedRef.current = false;
    setProcessing(false);
    setModal(result.status === "full" ? "full" : result.status === "insufficient" ? "insufficient" : "confirm");
  };

  return <>
    <button type="button" className={className} onClick={open}>{cta}</button>
    {modal && <div className="etickets-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}>
      <section className="etickets-modal tournament-entry-modal" role="dialog" aria-modal="true" aria-labelledby="tournament-entry-title">
        <button className="etickets-modal-close" type="button" aria-label="Cerrar" onClick={() => setModal(null)}>×</button>
        {modal === "confirm" && <>
          <small>CONFIRMAR PARTICIPACIÓN</small>
          <h2 id="tournament-entry-title">{tournament.gameName}</h2>
          <p>Usarás 1 eTicket para participar en este torneo.</p>
          <dl>
            <div><dt>Juego</dt><dd>{tournament.gameName}</dd></div>
            <div><dt>Saldo actual</dt><dd>{user?.etickets ?? 0} eTickets</dd></div>
            <div><dt>Saldo después</dt><dd>{(user?.etickets ?? 0) - tournament.entryCost} eTickets</dd></div>
          </dl>
          <div className="etickets-modal-actions">
            <button type="button" disabled={processing} onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" disabled={processing} onClick={confirm}>{processing ? "Preparando juegoâ€¦" : "Confirmar y jugar"}</button>
          </div>
        </>}
        {modal === "insufficient" && <><span><IconCoins /></span><small>SALDO INSUFICIENTE</small><h2 id="tournament-entry-title">Tus eTickets no son suficientes</h2><p>Necesitas 1 eTicket para participar en este torneo.</p><div className="tournament-entry-links"><Link href="/etickets">Conseguir eTickets</Link><button type="button" onClick={() => setModal(null)}>Cancelar</button></div></>}
        {modal === "full" && <><small>TORNEO COMPLETO</small><h2 id="tournament-entry-title">Cupos agotados</h2><p>Este torneo alcanzó el máximo de participantes.</p><button type="button" onClick={() => setModal(null)}>Entendido</button></>}
      </section>
    </div>}
  </>;
}
