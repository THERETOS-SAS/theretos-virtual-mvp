"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mockRedemptions, redemptionStatusLabels, type RedemptionItem } from "../data/mockRedemptions";
import { IconArrow, IconCoins, IconGift } from "./icons";

type RedemptionFilter = "all" | "progress" | "delivered";
const stages = ["requested", "approved", "preparing", "shipped", "delivered"] as const;

export function RedemptionsList() {
  const [filter, setFilter] = useState<RedemptionFilter>("all");
  const [selected, setSelected] = useState<RedemptionItem | null>(null);
  const visible = mockRedemptions.filter((item) => filter === "all" || (filter === "delivered" ? item.status === "delivered" : ["requested", "approved", "preparing", "shipped"].includes(item.status)));

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  return <>
    <div className="redemptions-filters" role="group" aria-label="Filtrar canjes">{(["all", "progress", "delivered"] as const).map((value) => <button type="button" className={filter === value ? "active" : undefined} aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{value === "all" ? "Todos" : value === "progress" ? "En proceso" : "Entregados"}</button>)}</div>
    {visible.length ? <div className="redemptions-grid">{visible.map((item) => <article className="redemption-card" key={item.id}><div className="redemption-art" aria-label={`Imagen de ${item.prizeName}`}><IconGift /></div><div className="redemption-copy"><span className={`redemption-status status-${item.status}`}>{redemptionStatusLabels[item.status]}</span><h3>{item.prizeName}</h3><strong><IconCoins /> {item.etickets} eTickets</strong><p>Solicitado: {item.requestedAt}</p><button type="button" onClick={() => setSelected(item)}>Ver detalle</button></div></article>)}</div> : <section className="redemptions-empty"><IconGift /><h2>Aún no tienes premios</h2><p>Explora el Marketplace y descubre las recompensas que puedes alcanzar con tus eTickets.</p><div><Link href="/marketplace">Ver premios <IconArrow /></Link><Link href="/tournaments">Ver torneos <IconArrow /></Link></div></section>}
    {selected && <RedemptionModal item={selected} onClose={() => setSelected(null)} />}
  </>;
}

function RedemptionModal({ item, onClose }: { item: RedemptionItem; onClose: () => void }) {
  const currentStage = item.status === "cancelled" ? -1 : stages.indexOf(item.status);
  return <div className="redemption-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="redemption-modal" role="dialog" aria-modal="true" aria-labelledby="redemption-detail-title"><button className="redemption-modal-close" type="button" aria-label="Cerrar" onClick={onClose}>×</button><small>DETALLE DEL CANJE</small><div className="redemption-modal-art"><IconGift /></div><h2 id="redemption-detail-title">{item.prizeName}</h2><dl><div><dt>eTickets utilizados</dt><dd>{item.etickets} eTickets</dd></div><div><dt>Fecha de solicitud</dt><dd>{item.requestedAt}</dd></div><div><dt>Estado</dt><dd>{redemptionStatusLabels[item.status]}</dd></div></dl><ol className="redemption-progress" aria-label="Progreso del canje">{stages.map((stage, index) => <li className={index <= currentStage ? "complete" : undefined} key={stage}><i aria-hidden="true" /><span>{redemptionStatusLabels[stage]}</span></li>)}</ol>{item.trackingCode && item.status === "shipped" && <aside className="redemption-tracking"><small>SEGUIMIENTO</small><strong>Código: {item.trackingCode}</strong></aside>}<p className="redemption-delivery-note">{item.deliveryNote}</p><aside className="redemption-delivery"><h3>Sobre la entrega</h3><p>Algunos premios pueden requerir información adicional para completar la entrega. THERETOS te indicará los pasos necesarios cuando corresponda.</p></aside></section></div>;
}
