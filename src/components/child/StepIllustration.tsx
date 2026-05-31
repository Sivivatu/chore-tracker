const glyphs: Record<string, string> = {
  dressed: "shirt",
  bed: "bed",
  breakfast: "bowl",
  teeth: "tooth",
  bag: "bag",
  toys: "blocks",
  reading: "book",
};

export function StepIllustration({
  illustrationKey,
  accent,
}: {
  illustrationKey: string;
  accent: string;
}) {
  return (
    <div
      className="grid aspect-square h-20 place-items-center rounded-md border-2 bg-white text-xs font-black uppercase shadow-sm"
      style={{ borderColor: accent, color: accent }}
      aria-label={`${glyphs[illustrationKey] ?? "task"} illustration`}
    >
      {glyphs[illustrationKey] ?? "task"}
    </div>
  );
}
