"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MarketplaceAward, MarketplaceCatalogResponse } from "../lib/marketplace/types";
import { MarketplaceAwardImage } from "./MarketplaceAwardImage";
import { MarketplacePrizeCard } from "./MarketplacePrizeCard";
import { useAuth } from "./AuthProvider";
import { IconArrow, IconCheckCircle, IconCoins, IconGift } from "./icons";
import Link from "next/link";

type Sort = "recommended" | "lowest" | "highest";

let catalogRequest: Promise<MarketplaceCatalogResponse> | null = null;
let catalogRequestedAt = 0;
const CLIENT_CATALOG_TTL_MS = 60_000;

const fetchCatalog = (force = false) => {
  if (force || Date.now() - catalogRequestedAt >= CLIENT_CATALOG_TTL_MS) catalogRequest = null;
  if (!catalogRequest) {
    catalogRequestedAt = Date.now();
    catalogRequest = fetch("/api/marketplace/catalog", { headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error("Catalog unavailable");
        return response.json() as Promise<MarketplaceCatalogResponse>;
      })
      .catch((error) => {
        catalogRequest = null;
        catalogRequestedAt = 0;
        throw error;
      });
  }
  return catalogRequest;
};

export function MarketplaceCatalog() {
  const { isAuthenticated, user } = useAuth();
  const playerBalance = user?.etickets ?? 0;
  const [catalog, setCatalog] = useState<MarketplaceCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recommended");
  const [selectedPrize, setSelectedPrize] = useState<MarketplaceAward | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setCatalog(await fetchCatalog(true));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchCatalog()
      .then((data) => { if (active) setCatalog(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visiblePrizes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-CO");
    const awards = (catalog?.awards ?? []).filter((award) =>
      (category === "all" || award.categoryId === category || (category === "other" && award.categoryName === "Otros")) &&
      (!normalizedQuery || award.name.toLocaleLowerCase("es-CO").includes(normalizedQuery)),
    );
    if (sort === "lowest") return [...awards].sort((a, b) => a.etickets - b.etickets);
    if (sort === "highest") return [...awards].sort((a, b) => b.etickets - a.etickets);
    return awards;
  }, [catalog, category, query, sort]);

  const majorPrize = useMemo(() => (catalog?.awards ?? [])
    .filter((award) => award.stock > 0 && award.etickets > 0)
    .reduce<MarketplaceAward | null>((major, award) => !major || award.etickets > major.etickets ? award : major, null), [catalog]);

  const closeModal = useCallback(() => { setSelectedPrize(null); setConfirmed(false); }, []);

  useEffect(() => {
    if (!selectedPrize) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeModal(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKeyDown); };
  }, [selectedPrize, closeModal]);

  if (loading) return <div className="marketplace-loading" aria-live="polite"><span>Cargando premios...</span><div>{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div></div>;

  if (error) return <div className="marketplace-state"><IconGift /><h2>No pudimos cargar los premios</h2><p>El catálogo no está disponible temporalmente. Intenta nuevamente en unos segundos.</p><button type="button" onClick={() => void loadCatalog()}>Reintentar</button></div>;

  if (!catalog?.awards.length) return <div className="marketplace-state"><IconGift /><h2>Próximamente</h2><p>Estamos preparando nuevas recompensas para la comunidad THERETOS.</p><div><Link href="/tournaments">Ver torneos</Link><Link href="/etickets">Recargar eTickets</Link></div></div>;

  const categoryOptions = catalog.categories.filter((item) => catalog.awards.some((award) => award.categoryId === item.id));
  const hasOthers = catalog.awards.some((award) => award.categoryName === "Otros");

  return (
    <>
      {majorPrize && isAuthenticated && <section className="marketplace-featured" aria-labelledby="featured-prize-title"><div className="marketplace-featured-art"><MarketplaceAwardImage imageUrl={majorPrize.imageUrl} name={majorPrize.name} featured /></div><div className="marketplace-featured-copy"><span>PREMIO MAYOR · SIGUE ACUMULANDO</span><h2 id="featured-prize-title">{majorPrize.name}</h2><strong><IconCoins /> {majorPrize.etickets.toLocaleString("es-CO")} eTickets</strong><p>Una de las recompensas más grandes disponibles actualmente en THERETOS.</p></div><dl><div><dt>Tu saldo</dt><dd>{playerBalance} eTickets</dd></div><div><dt>Te faltan</dt><dd>{Math.max(majorPrize.etickets - playerBalance, 0).toLocaleString("es-CO")} eTickets</dd></div></dl><Link href="/tournaments">Ver torneos <IconArrow /></Link></section>}

      <div className="marketplace-catalog-tools">
        <label><span>Buscar premio</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar premio" /></label>
        <label><span>Ordenar premios</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="recommended">Recomendados</option><option value="lowest">Menor eTicket</option><option value="highest">Mayor eTicket</option></select></label>
      </div>
      <div className="marketplace-filters" role="group" aria-label="Filtrar premios"><button type="button" className={category === "all" ? "active" : undefined} aria-pressed={category === "all"} onClick={() => setCategory("all")}>Todos</button>{categoryOptions.map((item) => <button type="button" className={category === item.id ? "active" : undefined} aria-pressed={category === item.id} onClick={() => setCategory(item.id)} key={item.id}>{item.name}</button>)}{hasOthers && <button type="button" className={category === "other" ? "active" : undefined} aria-pressed={category === "other"} onClick={() => setCategory("other")}>Otros</button>}</div>
      {visiblePrizes.length ? <div className="marketplace-prize-grid">{visiblePrizes.map((prize) => <MarketplacePrizeCard prize={prize} playerBalance={playerBalance} isAuthenticated={isAuthenticated} onRedeem={setSelectedPrize} key={prize.id} />)}</div> : <div className="marketplace-state compact"><h2>Sin resultados</h2><p>Prueba otra búsqueda o categoría.</p></div>}

      {selectedPrize && <div className="marketplace-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}><section className="marketplace-modal" role="dialog" aria-modal="true" aria-labelledby="redeem-title">{confirmed ? <div className="marketplace-modal-result"><span><IconCheckCircle /></span><small>CANJE DEMO</small><h2 id="redeem-title">Solicitud preparada</h2><p>El proceso de canje real se habilitará cuando conectemos tu cuenta y el sistema de recompensas.</p><button type="button" onClick={closeModal}>Entendido</button></div> : <><small>CONFIRMAR CANJE</small><h2 id="redeem-title">{selectedPrize.name}</h2><div className="marketplace-modal-image"><MarketplaceAwardImage imageUrl={selectedPrize.imageUrl} name={selectedPrize.name} /></div><strong className="marketplace-modal-cost"><IconCoins /> {selectedPrize.etickets.toLocaleString("es-CO")} eTickets</strong><dl><div><dt>Tu saldo</dt><dd>{playerBalance} eTickets</dd></div><div><dt>Saldo después</dt><dd>{playerBalance - selectedPrize.etickets} eTickets</dd></div></dl><p>Esta confirmación es demostrativa y no modifica tu saldo.</p><div className="marketplace-modal-actions"><button type="button" autoFocus onClick={() => setConfirmed(true)}>Continuar</button><button type="button" onClick={closeModal}>Cancelar</button></div></>}</section></div>}
    </>
  );
}
