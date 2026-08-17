"use client";

import { useEffect, useState } from "react";
import { rechargePackages } from "../data/rechargePackages";
import { IconArrow, IconCheckCircle, IconCoins } from "./icons";
import { useAuth } from "./AuthProvider";
import { RequireAuthAction } from "./RequireAuthAction";

const formatNumber = (amount: number) => new Intl.NumberFormat("es-CO").format(amount);

export function RechargeSelector() {
  const { isAuthenticated } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isPaymentDemoOpen, setIsPaymentDemoOpen] = useState(false);
  const selectedPackage = rechargePackages.find(({ id }) => id === selectedId);

  const selectPackage = (id: string) => {
    setSelectedId(id);
    setIsConfirmationOpen(true);
    setIsPaymentDemoOpen(false);
  };

  const changePackage = () => {
    setIsConfirmationOpen(false);
  };

  const handleProceedToPayment = () => {
    // Future payment gateway integration entry point.
    setIsConfirmationOpen(false);
    setIsPaymentDemoOpen(true);
  };

  useEffect(() => {
    if (!isConfirmationOpen && !isPaymentDemoOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsConfirmationOpen(false);
      setIsPaymentDemoOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isConfirmationOpen, isPaymentDemoOpen]);

  return (
    <div className="etickets-recharge-selector">
      <div className="etickets-packages" role="list" aria-label="Paquetes de recarga">
        {rechargePackages.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <article
              className={`etickets-package${isSelected ? " etickets-package-selected" : ""}${item.featured ? " etickets-package-popular" : ""}`}
              role="listitem"
              key={item.id}
            >
              {item.featured && <span className="etickets-popular-label">Recomendado</span>}
              <span className="etickets-package-icon"><IconCoins /></span>
              <h3>{formatNumber(item.totalEtickets)} eTickets</h3>
              <p>{item.bonusEtickets > 0 ? <><b>{item.baseEtickets} incluidos</b><span>+{item.bonusEtickets} DE OBSEQUIO</span></> : <b>Sin obsequio</b>}</p>
              <strong className="etickets-package-price">${formatNumber(item.priceCop)} COP</strong>
              {isAuthenticated ? <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectPackage(item.id)}
              >
                {isSelected ? "Elegido" : "Elegir"}
              </button> : <RequireAuthAction returnUrl="/etickets" message="Inicia sesión o crea tu cuenta para recargar eTickets y conservar tu saldo.">Elegir</RequireAuthAction>}
            </article>
          );
        })}
      </div>

      {isConfirmationOpen && selectedPackage && (
        <div className="etickets-modal-backdrop etickets-package-sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && changePackage()}>
          <section className="etickets-modal etickets-package-sheet" role="dialog" aria-modal="true" aria-labelledby="etickets-confirmation-title">
            <button className="etickets-modal-close" type="button" aria-label="Cerrar" onClick={changePackage}>×</button>
            <small>REVISA TU SELECCIÓN</small>
            <h2 id="etickets-confirmation-title">{formatNumber(selectedPackage.totalEtickets)} ETICKETS</h2>
            {selectedPackage.bonusEtickets > 0 && <p>{selectedPackage.baseEtickets} incluidos + {selectedPackage.bonusEtickets} de obsequio</p>}
            <strong className="etickets-package-sheet-price">${formatNumber(selectedPackage.priceCop)} COP</strong>
            <div className="etickets-modal-actions etickets-package-sheet-actions">
              <button type="button" autoFocus onClick={handleProceedToPayment}>Continuar al pago <IconArrow /></button>
              <button type="button" onClick={changePackage}>Cambiar paquete</button>
            </div>
          </section>
        </div>
      )}
      {isPaymentDemoOpen && <div className="etickets-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsPaymentDemoOpen(false)}><section className="etickets-modal" role="dialog" aria-modal="true" aria-labelledby="etickets-payment-title"><button className="etickets-modal-close" type="button" aria-label="Cerrar" onClick={() => setIsPaymentDemoOpen(false)}>×</button><span><IconCheckCircle /></span><small>RECARGA DEMO</small><h2 id="etickets-payment-title">Pago todavía no habilitado en este MVP.</h2><p>La integración con la pasarela de pagos se conectará en una siguiente etapa.</p><button type="button" autoFocus onClick={() => setIsPaymentDemoOpen(false)}>Entendido</button></section></div>}
    </div>
  );
}
