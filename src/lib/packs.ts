export type PackId = "lone_mouser" | "cabinet" | "pawliament";

export type BribePack = {
  id: PackId;
  name: string;
  cats: number;
  priceCents: number;
  priceLabel: string;
  blurb: string;
};

export const BRIBE_PACKS: BribePack[] = [
  {
    id: "lone_mouser",
    name: "Lone Mouser",
    cats: 1,
    priceCents: 99,
    priceLabel: "$0.99",
    blurb: "One cat. One truce. Pure diplomacy.",
  },
  {
    id: "cabinet",
    name: "Cabinet of Cats",
    cats: 5,
    priceCents: 399,
    priceLabel: "$3.99",
    blurb: "This cat plus 4 random colleagues join the cabinet.",
  },
  {
    id: "pawliament",
    name: "Pawliament Pack",
    cats: 10,
    priceCents: 699,
    priceLabel: "$6.99",
    blurb: "This cat plus 9 more. Full session of the house.",
  },
];

export function getPack(id: PackId): BribePack {
  return BRIBE_PACKS.find((p) => p.id === id) ?? BRIBE_PACKS[0];
}
