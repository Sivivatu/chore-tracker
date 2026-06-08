import type { ComponentType } from "react";
import {
  Bike,
  BookOpen,
  Brush,
  CakeSlice,
  FerrisWheel,
  Film,
  Gamepad2,
  Gift,
  Map,
  Music,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RewardIconKey =
  | "film"
  | "park"
  | "baking"
  | "game"
  | "book"
  | "art"
  | "music"
  | "bike"
  | "treat"
  | "outing";

export type RewardVisualValue =
  | { type: "icon"; iconKey: RewardIconKey }
  | { type: "upload"; imageUrl: string; uploadThingKey: string; imageName: string };

export const rewardIcons: Array<{
  key: RewardIconKey;
  label: string;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  { key: "film", label: "Film", Icon: Film },
  { key: "park", label: "Park", Icon: FerrisWheel },
  { key: "baking", label: "Baking", Icon: CakeSlice },
  { key: "game", label: "Game", Icon: Gamepad2 },
  { key: "book", label: "Book", Icon: BookOpen },
  { key: "art", label: "Art", Icon: Brush },
  { key: "music", label: "Music", Icon: Music },
  { key: "bike", label: "Bike", Icon: Bike },
  { key: "treat", label: "Treat", Icon: Gift },
  { key: "outing", label: "Outing", Icon: Map },
];

const rewardIconMap = Object.fromEntries(rewardIcons.map((icon) => [icon.key, icon])) as Record<
  RewardIconKey,
  (typeof rewardIcons)[number]
>;

export function isRewardIconKey(value: string): value is RewardIconKey {
  return value in rewardIconMap;
}

export function getRandomRewardIconKey() {
  return rewardIcons[Math.floor(Math.random() * rewardIcons.length)].key;
}

export function getDeterministicRewardIconKey(seed: string) {
  const total = Array.from(seed).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return rewardIcons[total % rewardIcons.length].key;
}

export function RewardVisual({
  visual,
  title,
  className,
}: {
  visual: RewardVisualValue;
  title: string;
  className?: string;
}) {
  if (visual.type === "upload") {
    return (
      <img
        src={visual.imageUrl}
        alt={title}
        className={cn("aspect-square rounded-md object-cover", className)}
      />
    );
  }

  const icon = rewardIconMap[visual.iconKey];
  const Icon = icon.Icon;
  return (
    <div
      className={cn(
        "grid aspect-square place-items-center rounded-md border border-ink/10 bg-white text-coral shadow-sm",
        className,
      )}
      aria-label={`${icon.label} reward icon`}
      data-testid={`reward-icon-${visual.iconKey}`}
    >
      <Icon aria-hidden className="h-1/2 w-1/2" />
    </div>
  );
}
