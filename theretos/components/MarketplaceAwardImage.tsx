"use client";

import Image from "next/image";
import { useState } from "react";
import { MarketplacePrizeIcon } from "./MarketplacePrizeIcon";

export function MarketplaceAwardImage({ imageUrl, name, featured = false }: { imageUrl: string | null; name: string; featured?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) return <div className="marketplace-image-placeholder" aria-label={`Imagen no disponible para ${name}`}><MarketplacePrizeIcon /></div>;

  return <Image src={imageUrl} alt={name} fill sizes={featured ? "(max-width: 760px) 82px, 140px" : "(max-width: 760px) 100vw, (max-width: 1000px) 50vw, 33vw"} className="marketplace-award-image" onError={() => setFailed(true)} />;
}
