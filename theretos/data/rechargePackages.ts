export type RechargePackage = {
  id: string;
  name: string;
  priceCop: number;
  baseEtickets: number;
  bonusEtickets: number;
  totalEtickets: number;
  featured?: boolean;
};

export const rechargePackages: RechargePackage[] = [
  { id: "basic", name: "eCard $10K", priceCop: 10000, baseEtickets: 5, bonusEtickets: 0, totalEtickets: 5 },
  { id: "plus", name: "eCard $20K", priceCop: 20000, baseEtickets: 10, bonusEtickets: 2, totalEtickets: 12, featured: true },
  { id: "pro", name: "eCard $50K", priceCop: 50000, baseEtickets: 25, bonusEtickets: 5, totalEtickets: 30 },
  { id: "max", name: "eCard $100K", priceCop: 100000, baseEtickets: 50, bonusEtickets: 10, totalEtickets: 60 },
];
