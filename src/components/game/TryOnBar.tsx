import { RotateCw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame, saveNow } from "@/game/store";
import { OUTFITS, HAIR_COLORS, NAIL_COLORS, TATTOOS } from "@/game/catalog";
import { PRICES, naira } from "@/game/rules";
import { rt } from "@/game/runtime";
import { requestPurchase } from "@/game/actions";
import { cancelTryOn } from "@/game/life";

const HAIR_NAMES = ["Fade", "Afro Puff", "Braids", "Bob & Bun", "Bald"];

export function TryOnBar() {
  const s = useGame();
  const profile = s.profile;
  if (!s.tryOn || !profile || !s.previewLook) return null;

  const preview = s.previewLook;
  const setPreview = (patchLook: Partial<typeof preview>) => {
    s.patch({ previewLook: { ...preview, ...patchLook } });
  };

  const commitLook = (extra?: Partial<typeof s>) => {
    s.patch({
      ...extra,
      profile: { ...profile, look: { ...preview } },
      tryOn: null,
      previewLook: null,
    });
    saveNow();
  };

  const renderFooter = () => {
    if (s.tryOn === "wardrobe") {
      return (
        <Button
          size="sm"
          className="flex-1 font-bold"
          onClick={() => {
            commitLook();
            s.notify("👕 New look equipped!");
          }}
        >
          <Check className="mr-1 h-4 w-4" />
          Wear This Look
        </Button>
      );
    }

    if (s.tryOn === "clothes") {
      const match = OUTFITS.find((o) => o.shirt === preview.shirt && o.pants === preview.pants);
      const owned = match ? s.wardrobe.includes(match.id) : true;
      const alreadyWearing =
        profile.look.shirt === preview.shirt && profile.look.pants === preview.pants;

      if (owned || !match) {
        return (
          <Button
            size="sm"
            className="flex-1 font-bold"
            disabled={alreadyWearing}
            onClick={() => {
              commitLook();
              s.notify(`👗 Wearing ${match?.name ?? "outfit"}!`);
            }}
          >
            <Check className="mr-1 h-4 w-4" />
            {alreadyWearing ? "Currently Wearing" : "Wear (Owned)"}
          </Button>
        );
      }

      return (
        <Button
          size="sm"
          className="flex-1 font-bold"
          onClick={() =>
            requestPurchase({
              title: match.name,
              preview: `👗 Designer outfit from Ada's Boutique & Salon`,
              price: match.price,
              swatch: { a: match.shirt, b: match.pants },
              onConfirm: () => {
                const cur = useGame.getState();
                const nextWardrobe = cur.wardrobe.includes(match.id)
                  ? cur.wardrobe
                  : [...cur.wardrobe, match.id];
                commitLook({ wardrobe: nextWardrobe });
                cur.notify(`👗 Bought & wearing ${match.name}!`);
              },
            })
          }
        >
          Buy Outfit · {naira(match.price)}
        </Button>
      );
    }

    if (s.tryOn === "hair") {
      const changed =
        preview.hairStyle !== profile.look.hairStyle || preview.hair !== profile.look.hair;
      const styleName = HAIR_NAMES[preview.hairStyle] ?? "Hairstyle";
      return (
        <Button
          size="sm"
          className="flex-1 font-bold"
          disabled={!changed}
          onClick={() =>
            requestPurchase({
              title: `${styleName} Hair Styling`,
              preview: `💇 Fresh salon cut & dye at Ada's Boutique`,
              price: PRICES.hair,
              swatch: { a: preview.hair },
              onConfirm: () => {
                commitLook();
                useGame.getState().notify(`💇 Fresh ${styleName} look locked in!`);
              },
            })
          }
        >
          {changed ? `Get Styled · ${naira(PRICES.hair)}` : "Current Style"}
        </Button>
      );
    }

    if (s.tryOn === "nails") {
      const nail = NAIL_COLORS.find((n) => n.color === (preview.nails ?? ""));
      const unchanged = (preview.nails ?? "") === (profile.look.nails ?? "");
      if (!nail || nail.price === 0) {
        return (
          <Button
            size="sm"
            className="flex-1 font-bold"
            disabled={unchanged}
            onClick={() => {
              commitLook();
              s.notify("💅 Back to natural gloss nails!");
            }}
          >
            {unchanged ? "Current Nails" : "Apply Natural Gloss (Free)"}
          </Button>
        );
      }
      return (
        <Button
          size="sm"
          className="flex-1 font-bold"
          disabled={unchanged}
          onClick={() =>
            requestPurchase({
              title: `${nail.name} Manicure`,
              preview: `💅 Glossy manicure at Ada's Nail Station`,
              price: nail.price,
              swatch: { a: nail.color },
              onConfirm: () => {
                commitLook();
                useGame.getState().notify(`💅 ${nail.name} nails looking fresh!`);
              },
            })
          }
        >
          {unchanged ? "Current Nails" : `Get Manicure · ${naira(nail.price)}`}
        </Button>
      );
    }

    // Tattoo Studio mode
    const tatId = preview.tattoo ?? "none";
    const tat = TATTOOS.find((t) => t.id === tatId) ?? TATTOOS[0]!;
    const currentTat = profile.look.tattoo ?? "none";
    const unchanged = tatId === currentTat;
    const owned = tatId !== "none" && s.tattoos.includes(tatId);

    if (tatId === "none") {
      if (currentTat === "none") {
        return (
          <Button size="sm" className="flex-1 font-bold" disabled>
            Clean Skin (Current)
          </Button>
        );
      }
      return (
        <Button
          size="sm"
          className="flex-1 font-bold"
          onClick={() =>
            requestPurchase({
              title: "Laser Tattoo Removal",
              preview: "✨ Clean removal at Ink Studio",
              price: PRICES.tattooRemove,
              onConfirm: () => {
                commitLook();
                useGame.getState().notify("✨ Tattoo cleanly removed!");
              },
            })
          }
        >
          Remove Tattoo · {naira(PRICES.tattooRemove)}
        </Button>
      );
    }

    if (owned) {
      return (
        <Button
          size="sm"
          className="flex-1 font-bold"
          disabled={unchanged}
          onClick={() => {
            commitLook();
            s.notify(`🖋️ Wearing ${tat.name}!`);
          }}
        >
          {unchanged ? "Current Ink" : "Apply Owned Ink (Free)"}
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        className="flex-1 font-bold"
        onClick={() =>
          requestPurchase({
            title: tat.name,
            preview: `🖋️ ${tat.desc} at Ink Studio`,
            price: tat.price,
            swatch: { a: tat.ink },
            onConfirm: () => {
              const cur = useGame.getState();
              const nextTats = cur.tattoos.includes(tat.id)
                ? cur.tattoos
                : [...cur.tattoos, tat.id];
              commitLook({ tattoos: nextTats });
              cur.notify(`🔥 Fresh ${tat.name} ink done!`);
            },
          })
        }
      >
        Get Inked · {naira(tat.price)}
      </Button>
    );
  };

  const title =
    s.tryOn === "wardrobe"
      ? "👕 Apartment Wardrobe · Live Preview"
      : s.tryOn === "clothes"
        ? "👗 Ada's Boutique · Mirror Try-On"
        : s.tryOn === "hair"
          ? "💇 Hair Station · Live Try-On"
          : s.tryOn === "nails"
            ? "💅 Nail Station · Live Try-On"
            : "🖋️ Ink Studio · Tattoo Preview";

  return (
    <div
      className="pointer-events-auto absolute inset-x-3 bottom-4 z-20 mx-auto max-w-xl rounded-xl border border-border bg-card/95 p-3 shadow-xl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold">{title}</p>
          <p className="text-[10px] text-muted-foreground">
            Drag character above or tap Rotate · Balance: {naira(s.money)}
          </p>
        </div>
        <Button
          variant="game"
          size="sm"
          className="h-8 shrink-0 px-2 text-xs"
          onClick={() => {
            rt.tryOnYaw += Math.PI / 2;
          }}
        >
          <RotateCw className="mr-1 h-3.5 w-3.5" />
          Rotate
        </Button>
      </div>

      {s.tryOn === "wardrobe" && (
        <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
          {OUTFITS.filter((o) => s.wardrobe.includes(o.id)).map((o) => {
            const active = preview.shirt === o.shirt && preview.pants === o.pants;
            return (
              <Button
                key={o.id}
                size="sm"
                variant={active ? "default" : "game"}
                className="h-auto shrink-0 gap-1.5 px-2.5 py-1.5 text-xs"
                onClick={() => setPreview({ shirt: o.shirt, pants: o.pants })}
              >
                <span className="flex gap-0.5">
                  <span className="h-4 w-2 rounded-xs" style={{ backgroundColor: o.shirt }} />
                  <span className="h-4 w-2 rounded-xs" style={{ backgroundColor: o.pants }} />
                </span>
                {o.name}
              </Button>
            );
          })}
        </div>
      )}

      {s.tryOn === "clothes" && (
        <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
          {OUTFITS.map((o) => {
            const active = preview.shirt === o.shirt && preview.pants === o.pants;
            const owned = s.wardrobe.includes(o.id);
            return (
              <Button
                key={o.id}
                size="sm"
                variant={active ? "default" : "game"}
                className="h-auto shrink-0 gap-1.5 px-2.5 py-1.5 text-left text-xs"
                onClick={() => setPreview({ shirt: o.shirt, pants: o.pants })}
              >
                <span className="flex gap-0.5">
                  <span className="h-5 w-2.5 rounded-xs" style={{ backgroundColor: o.shirt }} />
                  <span className="h-5 w-2.5 rounded-xs" style={{ backgroundColor: o.pants }} />
                </span>
                <span>
                  <span className="block font-bold leading-tight">{o.name}</span>
                  <span className="block text-[10px] opacity-75">
                    {owned ? "Owned" : naira(o.price)}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      )}

      {s.tryOn === "hair" && (
        <div className="mb-2.5 space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {HAIR_NAMES.map((name, i) => (
              <Button
                key={name}
                size="sm"
                variant={preview.hairStyle === i ? "default" : "game"}
                className="shrink-0 px-2.5 text-xs"
                onClick={() => setPreview({ hairStyle: i })}
              >
                {name}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Dye:</span>
            {HAIR_COLORS.map((c, i) => (
              <button
                key={c}
                type="button"
                aria-label={`Hair color ${i + 1}`}
                className={`h-6 w-6 rounded-full border-2 ${
                  preview.hair === c ? "border-primary scale-110" : "border-border"
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setPreview({ hair: c })}
              />
            ))}
          </div>
        </div>
      )}

      {s.tryOn === "nails" && (
        <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
          {NAIL_COLORS.map((n) => {
            const active = (preview.nails ?? "") === n.color;
            return (
              <Button
                key={n.id}
                size="sm"
                variant={active ? "default" : "game"}
                className="h-auto shrink-0 gap-1.5 px-2.5 py-1.5 text-left text-xs"
                onClick={() => setPreview({ nails: n.color })}
              >
                <span
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: n.color || "#e8c4a6" }}
                />
                <span>
                  <span className="block font-bold leading-tight">{n.name}</span>
                  <span className="block text-[10px] opacity-75">
                    {n.price === 0 ? "Free" : naira(n.price)}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      )}

      {s.tryOn === "tattoo" && (
        <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
          {TATTOOS.map((t) => {
            const active = (preview.tattoo ?? "none") === t.id;
            const owned = t.id !== "none" && s.tattoos.includes(t.id);
            return (
              <Button
                key={t.id}
                size="sm"
                variant={active ? "default" : "game"}
                className="h-auto shrink-0 gap-1.5 px-2.5 py-1.5 text-left text-xs"
                onClick={() => setPreview({ tattoo: t.id })}
              >
                <span
                  className="h-4 w-4 rounded-sm border border-border"
                  style={{ backgroundColor: t.id === "none" ? "#d8b496" : t.ink }}
                />
                <span>
                  <span className="block font-bold leading-tight">{t.name}</span>
                  <span className="block text-[10px] opacity-75">
                    {owned ? "Owned" : naira(t.price)}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="game" size="sm" className="px-3 text-xs" onClick={cancelTryOn}>
          <X className="mr-1 h-3.5 w-3.5" />
          Cancel
        </Button>
        {renderFooter()}
      </div>
    </div>
  );
}
