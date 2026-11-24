import { useState } from "react";
import {
  X,
  RotateCw,
  Trash2,
  Flower2,
  LampFloor,
  Gem,
  ShoppingBag,
  Armchair,
  BookOpen,
  Square,
  Table2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame, saveNow } from "@/game/store";
import { ROOM_THEMES, DECOR_CATALOG, MARKET_ITEMS, type DecorKind } from "@/game/catalog";
import { apartmentBlocked, insideHomeBathroom } from "@/game/sim/apartment";
import { VEHICLE_CATALOG } from "@/game/sim/mobility";
import {
  purchaseVehicle,
  confirmDivorce,
  buyMarketItem,
  requestHouseUpgrade,
  requestRideUpgrade,
} from "@/game/life";
import { requestPurchase, confirmPendingPurchase, cancelPendingPurchase } from "@/game/actions";
import { HOUSES, RIDE_TIERS, naira } from "@/game/rules";
import { LANDMARK_TITLE, type Landmark } from "@/game/world";
import { rt } from "@/game/runtime";
import { MapCanvas } from "./Map";
import { TryOnBar } from "./TryOnBar";

function decorIcon(kind: DecorKind) {
  switch (kind) {
    case "plant":
      return <Flower2 size={16} />;
    case "lamp":
      return <LampFloor size={16} />;
    case "armchair":
      return <Armchair size={16} />;
    case "rug":
      return <Square size={16} />;
    case "bookshelf":
      return <BookOpen size={16} />;
    case "table":
      return <Table2 size={16} />;
    default:
      return <Gem size={16} />;
  }
}

function decorSymbol(k: DecorKind) {
  switch (k) {
    case "plant":
      return "🌿";
    case "lamp":
      return "💡";
    case "armchair":
      return "🪑";
    case "rug":
      return "🟫";
    case "bookshelf":
      return "📚";
    case "table":
      return "🪵";
    default:
      return "◆";
  }
}

function PurchaseConfirmModal() {
  const s = useGame();
  const req = s.pendingPurchase;
  if (!req) return null;

  const remaining = s.money - req.price;
  const affordable = remaining >= 0;

  return (
    <div className="game-modal z-40" onPointerDown={(e) => e.stopPropagation()}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Confirm purchase: ${req.title}`}
        className="game-dialog max-w-sm space-y-4"
      >
        <header className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Confirm Purchase
            </p>
            <h2 className="text-lg font-extrabold">{req.title}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cancel purchase"
            onClick={cancelPendingPurchase}
          >
            <X />
          </Button>
        </header>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          {req.swatch && (
            <span className="flex shrink-0 gap-0.5 rounded border border-border p-1 bg-card">
              <span className="h-8 w-4 rounded-xs" style={{ backgroundColor: req.swatch.a }} />
              {req.swatch.b && (
                <span className="h-8 w-4 rounded-xs" style={{ backgroundColor: req.swatch.b }} />
              )}
            </span>
          )}
          <p className="text-sm text-foreground">{req.preview}</p>
        </div>

        <div className="space-y-1.5 rounded-lg border border-border bg-background/50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Price</span>
            <span className="font-extrabold text-primary">{naira(req.price)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Current balance</span>
            <span>{naira(s.money)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-1.5 text-xs font-bold">
            <span>Balance after purchase</span>
            <span className={affordable ? "text-foreground" : "text-destructive"}>
              {affordable ? naira(remaining) : `Short by ${naira(-remaining)}`}
            </span>
          </div>
        </div>

        {!affordable && (
          <p className="text-xs font-medium text-destructive">
            Not enough ₦ in your account. Work remotely at home to earn more!
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="game" className="flex-1" onClick={cancelPendingPurchase}>
            Cancel
          </Button>
          <Button
            className="flex-1 font-bold"
            disabled={!affordable}
            onClick={confirmPendingPurchase}
          >
            Confirm &amp; Pay {naira(req.price)}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Decoration() {
  const s = useGame();
  const [kind, setKind] = useState<DecorKind>("plant");
  const [selected, setSelected] = useState<string | null>(null);
  const selectedItem = s.decor.find((d) => d.id === selected);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Tap an open spot to buy &amp; place, or tap a placed piece to move/rotate.</span>
        <span className="font-bold text-primary">{naira(s.money)}</span>
      </div>
      <div className="flex gap-2">
        {ROOM_THEMES.map((theme) => (
          <Button
            key={theme.id}
            className="h-auto flex-1 flex-col whitespace-normal p-2 text-xs"
            variant={s.roomTheme === theme.id ? "default" : "game"}
            onClick={() => {
              s.patch({ roomTheme: theme.id });
              saveNow();
            }}
          >
            <span className="h-5 w-full rounded-sm" style={{ backgroundColor: theme.sofa }} />
            {theme.name}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {DECOR_CATALOG.map((item) => (
          <Button
            key={item.kind}
            className="h-auto flex-col gap-0.5 whitespace-normal p-2 text-[11px]"
            variant={kind === item.kind && !selected ? "default" : "game"}
            onClick={() => {
              setKind(item.kind);
              setSelected(null);
            }}
          >
            {decorIcon(item.kind)}
            <span>{item.name}</span>
            <span className="opacity-80">{naira(item.price)}</span>
          </Button>
        ))}
      </div>
      <div className="decor-grid" aria-label="Room decoration layout">
        {Array.from({ length: 99 }, (_, i) => {
          const x = (i % 11) - 5;
          const z = Math.floor(i / 11) - 4;
          const item = s.decor.find((d) => Math.round(d.x) === x && Math.round(d.z) === z);
          const catalogEntry = DECOR_CATALOG.find((d) => d.kind === (selectedItem?.kind ?? kind));
          const isWalkable = catalogEntry?.walkable === true;
          const inBath = insideHomeBathroom(x, z);
          const blocked =
            inBath ||
            (!isWalkable && apartmentBlocked(x, z, 0.45)) ||
            (!isWalkable && Math.hypot(x - rt.player.x, z - rt.player.z) < 1);
          return (
            <Button
              key={i}
              className="decor-cell"
              variant={item?.id === selected ? "default" : "game"}
              aria-label={`Room spot ${x}, ${z}${item ? `, ${item.kind}` : ""}`}
              disabled={blocked && !item}
              onClick={() => {
                if (item) {
                  setSelected(item.id);
                  return;
                }
                if (selectedItem) {
                  s.patch({ decor: s.decor.map((d) => (d.id === selected ? { ...d, x, z } : d)) });
                  saveNow();
                  return;
                }
                const entry = DECOR_CATALOG.find((d) => d.kind === kind);
                if (!entry) return;
                requestPurchase({
                  title: entry.name,
                  preview: `${decorSymbol(kind)} Place ${entry.name} in your apartment at (${x}, ${z})`,
                  price: entry.price,
                  onConfirm: () => {
                    const id = crypto.randomUUID();
                    const cur = useGame.getState();
                    cur.patch({
                      decor: [...cur.decor, { id, kind, x, z, rotation: 0 }],
                    });
                    setSelected(id);
                    cur.notify(`✨ Placed ${entry.name} in your apartment!`);
                  },
                });
              }}
            >
              {item ? decorSymbol(item.kind) : inBath ? "🚿" : blocked ? "▪" : ""}
            </Button>
          );
        })}
      </div>
      {selectedItem && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
          <p className="mr-auto text-sm font-medium capitalize">
            {selectedItem.kind} selected — tap open cell to move
          </p>
          <Button
            variant="game"
            size="icon"
            aria-label="Rotate decoration"
            title="Rotate 90°"
            onClick={() => {
              s.patch({
                decor: s.decor.map((d) =>
                  d.id === selected ? { ...d, rotation: d.rotation + Math.PI / 2 } : d,
                ),
              });
              saveNow();
            }}
          >
            <RotateCw />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            aria-label="Remove decoration"
            title="Sell / Remove"
            onClick={() => {
              const refund = Math.round(
                (DECOR_CATALOG.find((c) => c.kind === selectedItem.kind)?.price ?? 0) * 0.5,
              );
              s.patch({ money: s.money + refund, decor: s.decor.filter((d) => d.id !== selected) });
              setSelected(null);
              saveNow();
              if (refund > 0) s.notify(`Removed item (+${naira(refund)} refund)`);
            }}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  );
}

const AISLES: { id: "produce" | "grill" | "drinks"; title: string }[] = [
  { id: "produce", title: "🥬 Aisle 1 · Produce & Ingredients" },
  { id: "grill", title: "🔥 Counter 2 · Hot Puff-Puff & Suya" },
  { id: "drinks", title: "🥤 Aisle 3 · Chilled Drinks & Home" },
];

export function GameDialogs() {
  const s = useGame();

  const renderModal = () => {
    if (!s.dialog) return null;
    const title =
      s.dialog === "decorate"
        ? "Decorate apartment"
        : s.dialog === "upgrade"
          ? "Upgrade House & Ride"
          : s.dialog === "dealer"
            ? "City Motors"
            : s.dialog === "market"
              ? "Balogun Supermarket"
              : s.dialog === "realtor"
                ? "Prime Realtors"
                : s.dialog === "map"
                  ? "Reformed City"
                  : "Go your separate ways?";

    return (
      <div className="game-modal z-30" onPointerDown={(e) => e.stopPropagation()}>
        <section role="dialog" aria-modal="true" aria-label={title} className="game-dialog">
          <header className="mb-5 flex items-center justify-between gap-2">
            <h2>{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close dialog"
              title="Close"
              onClick={() => {
                s.patch({ dialog: null });
                saveNow();
              }}
            >
              <X />
            </Button>
          </header>

          {s.dialog === "decorate" && <Decoration />}

          {s.dialog === "market" && (
            <div className="space-y-4">
              {AISLES.map((aisle) => (
                <div key={aisle.id} className="space-y-2">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
                    {aisle.title}
                  </p>
                  {MARKET_ITEMS.filter((item) => item.aisle === aisle.id).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/25 p-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl">{item.emoji}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 font-bold"
                        onClick={() => buyMarketItem(item.id)}
                      >
                        {naira(item.price)}
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {s.dialog === "realtor" && (
            <div className="space-y-3">
              {HOUSES.map((h, i) => {
                const owned = s.house >= i;
                const current = s.house === i;
                return (
                  <div
                    key={h.name}
                    className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
                  >
                    <div>
                      <p className="font-bold">🏠 {h.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.price === 0 ? "Starter Apartment" : naira(h.price)}
                      </p>
                    </div>
                    {owned ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-primary">
                        <Check size={14} /> {current ? "Current Home" : "Owned"}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          requestPurchase({
                            title: h.name,
                            preview: `🏡 Upgrade your residence status at Prime Realtors (+100 XP)`,
                            price: h.price,
                            onConfirm: () => {
                              const cur = useGame.getState();
                              cur.patch({ house: i, dialog: null });
                              cur.addXp(100);
                              cur.notify(`🏡 Welcome to your ${h.name}! +100 XP`);
                            },
                          })
                        }
                      >
                        Buy · {naira(h.price)}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {s.dialog === "upgrade" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
                    🏡 Apartment Tier Upgrades
                  </p>
                  <span className="text-xs font-bold text-primary">{naira(s.money)}</span>
                </div>
                {HOUSES.map((h, i) => {
                  const owned = s.house >= i;
                  const isCurrent = s.house === i;
                  const isNext = i === s.house + 1;
                  return (
                    <div
                      key={h.name}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/25 p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{h.desc}</p>
                      </div>
                      {owned ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
                          <Check size={14} /> {isCurrent ? "Current" : "Owned"}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          className="shrink-0 font-bold"
                          disabled={!isNext}
                          onClick={() => requestHouseUpgrade(i)}
                        >
                          {isNext ? `Upgrade · ${naira(h.price)}` : `Tier ${i + 1}`}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
                  🚘 Garage Ride Upgrades (Step-by-Step)
                </p>
                {RIDE_TIERS.map((r) => {
                  const owned = s.rideTier >= r.tier;
                  const isCurrent = s.rideTier === r.tier;
                  const isNext = r.tier === s.rideTier + 1;
                  const icon =
                    r.kind === "supercar"
                      ? "🏎️"
                      : r.kind === "car"
                        ? "🚘"
                        : r.kind === "moto"
                          ? "🏍️"
                          : "🚲";
                  return (
                    <div
                      key={r.tier}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/25 p-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl">{icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.desc}</p>
                        </div>
                      </div>
                      {owned ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
                          <Check size={14} /> {isCurrent ? "Active Ride" : "Unlocked"}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          className="shrink-0 font-bold"
                          disabled={!isNext}
                          onClick={() => requestRideUpgrade(r.tier)}
                        >
                          {isNext ? `Buy · ${naira(r.price)}` : `Step ${r.tier}`}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {s.dialog === "dealer" && (
            <div className="space-y-3">
              {VEHICLE_CATALOG.map((v) => {
                const owned = s.vehicles.some((o) => o.kind === v.kind);
                const icon =
                  v.kind === "supercar"
                    ? "🏎️"
                    : v.kind === "car"
                      ? "🚘"
                      : v.kind === "moto"
                        ? "🏍️"
                        : "🚲";
                return (
                  <div
                    key={v.kind}
                    className="flex items-center justify-between gap-4 border-b border-border py-4"
                  >
                    <div>
                      <p className="text-2xl">{icon}</p>
                      <p className="font-bold">{v.name}</p>
                      <p className="text-sm text-muted-foreground">{naira(v.price)}</p>
                    </div>
                    <Button disabled={owned} onClick={() => purchaseVehicle(v.kind)}>
                      <ShoppingBag />
                      {owned ? "Owned" : "Buy"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {s.dialog === "divorce" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                End your marriage to {s.partner?.name}? You'll both be single again.
              </p>
              <div className="flex gap-2">
                <Button variant="game" className="flex-1" onClick={() => s.patch({ dialog: null })}>
                  Stay together
                </Button>
                <Button variant="destructive" className="flex-1" onClick={confirmDivorce}>
                  Confirm divorce
                </Button>
              </div>
            </div>
          )}

          {s.dialog === "map" && (
            <div className="space-y-4">
              <MapCanvas large />
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(LANDMARK_TITLE) as Landmark[]).map((l) => (
                  <Button
                    key={l}
                    variant={s.waypoint === l ? "default" : "game"}
                    className="h-auto justify-start whitespace-normal p-2 text-left text-xs"
                    onClick={() => s.patch({ waypoint: l, dialog: null })}
                  >
                    {LANDMARK_TITLE[l]}
                  </Button>
                ))}
              </div>
              {s.waypoint && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => s.patch({ waypoint: null, dialog: null })}
                >
                  Clear destination
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    );
  };

  return (
    <>
      <TryOnBar />
      {renderModal()}
      <PurchaseConfirmModal />
    </>
  );
}
