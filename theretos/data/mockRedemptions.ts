export type RedemptionStatus = "requested" | "approved" | "preparing" | "shipped" | "delivered" | "cancelled";

export type RedemptionItem = {
  id: string;
  prizeName: string;
  imageUrl?: string;
  etickets: number;
  requestedAt: string;
  status: RedemptionStatus;
  category?: string;
  trackingCode?: string;
  deliveryNote?: string;
};

export const mockRedemptionSummary = { total: 3, inProgress: 1, delivered: 2 } as const;

export const mockRedemptions: readonly RedemptionItem[] = [
  { id: "redemption-001", prizeName: "Libreta Argollada", etickets: 10, requestedAt: "10 ago 2026", status: "delivered", category: "Accesorios", deliveryNote: "Canje completado." },
  { id: "redemption-002", prizeName: "Forro de Celular", etickets: 25, requestedAt: "12 ago 2026", status: "preparing", category: "Tecnología", deliveryNote: "Estamos preparando tu recompensa." },
  { id: "redemption-003", prizeName: "Recompensa THERETOS", etickets: 15, requestedAt: "14 ago 2026", status: "requested", category: "THERETOS", deliveryNote: "Tu solicitud fue recibida." },
] as const;

export const redemptionStatusLabels: Record<RedemptionStatus, string> = {
  requested: "Solicitado",
  approved: "Aprobado",
  preparing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};
