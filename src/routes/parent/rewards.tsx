import { Image, Pencil, UploadCloud } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { hasClerkConfig, isE2EAuthBypass } from "@/app/providers";
import {
  getDeterministicRewardIconKey,
  getRandomRewardIconKey,
  isRewardIconKey,
  rewardIcons,
  RewardVisual,
  type RewardVisualValue,
} from "@/lib/rewardVisuals";
import { useUploadThing } from "@/lib/uploadthing";

type RewardForm = {
  rewardId: Id<"rewards"> | null;
  title: string;
  pointsCost: string;
  active: boolean;
  visual: RewardVisualValue | null;
};

type UploadedRewardImage = {
  name: string;
  key: string;
  ufsUrl?: string;
  url?: string;
  serverData?: {
    imageUrl?: string;
    uploadThingKey?: string;
    imageName?: string;
  } | null;
};

const emptyForm: RewardForm = {
  rewardId: null,
  title: "",
  pointsCost: "",
  active: true,
  visual: null,
};

function visualFromReward(reward: {
  _id: Id<"rewards">;
  title: string;
  visualType?: "icon" | "upload";
  iconKey?: string;
  imageUrl?: string;
  uploadThingKey?: string;
  imageName?: string;
}): RewardVisualValue {
  if (
    reward.visualType === "upload" &&
    reward.imageUrl &&
    reward.uploadThingKey &&
    reward.imageName
  ) {
    return {
      type: "upload",
      imageUrl: reward.imageUrl,
      uploadThingKey: reward.uploadThingKey,
      imageName: reward.imageName,
    };
  }

  return {
    type: "icon",
    iconKey:
      reward.iconKey && isRewardIconKey(reward.iconKey)
        ? reward.iconKey
        : getDeterministicRewardIconKey(`${reward._id}:${reward.title}`),
  };
}

function RewardImageUpload({
  onUploaded,
  onError,
}: {
  onUploaded: (visual: Extract<RewardVisualValue, { type: "upload" }>) => void;
  onError: (message: string) => void;
}) {
  if (isE2EAuthBypass()) {
    return <E2ERewardImageUpload onUploaded={onUploaded} onError={onError} />;
  }

  if (!hasClerkConfig()) {
    return (
      <p className="text-sm font-semibold text-ink/60">Configure Clerk to upload reward images.</p>
    );
  }

  return <AuthenticatedRewardImageUpload onUploaded={onUploaded} onError={onError} />;
}

function uploadVisualFromFile(uploadedFile: UploadedRewardImage) {
  return {
    type: "upload" as const,
    imageUrl: uploadedFile.serverData?.imageUrl ?? uploadedFile.ufsUrl ?? uploadedFile.url ?? "",
    uploadThingKey: uploadedFile.serverData?.uploadThingKey ?? uploadedFile.key,
    imageName: uploadedFile.serverData?.imageName ?? uploadedFile.name,
  };
}

function E2ERewardImageUpload({
  onUploaded,
  onError,
}: {
  onUploaded: (visual: Extract<RewardVisualValue, { type: "upload" }>) => void;
  onError: (message: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  async function uploadFiles(files: FileList | File[]) {
    const file = Array.from(files).find((file) => file.type.startsWith("image/"));
    if (!file) {
      onError("Choose an image file to upload.");
      return;
    }

    setFileName(file.name);
    const imageUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read image file."));
      reader.readAsDataURL(file);
    });

    onUploaded({
      type: "upload",
      imageUrl,
      uploadThingKey: `e2e-${file.name}`,
      imageName: file.name,
    });
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) void uploadFiles(event.target.files);
          event.target.value = "";
        }}
        aria-label="Upload reward image file"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="grid w-full place-items-center rounded-lg border border-dashed border-ink/20 bg-paper/60 px-4 py-5 text-center transition hover:border-teal"
      >
        <span className="grid h-12 w-12 place-items-center rounded-md bg-white text-teal shadow-sm">
          <UploadCloud aria-hidden className="h-7 w-7" />
        </span>
        <span className="mt-3 text-sm font-bold text-ink">Drag image here or click to upload</span>
        <span className="mt-1 text-xs font-semibold text-ink/55">
          {fileName || "E2E image upload"}
        </span>
      </button>
    </div>
  );
}

function AuthenticatedRewardImageUpload({
  onUploaded,
  onError,
}: {
  onUploaded: (visual: Extract<RewardVisualValue, { type: "upload" }>) => void;
  onError: (message: string) => void;
}) {
  const { getToken, isSignedIn } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const { startUpload, isUploading } = useUploadThing("rewardImageUploader", {
    headers: async () => {
      const token = await getToken();
      return token ? { authorization: `Bearer ${token}` } : new Headers();
    },
    onUploadError: (error) => {
      const uploadThingFallback = "Something went wrong. Please report this to UploadThing.";
      onError(
        error.message === uploadThingFallback
          ? "UploadThing rejected the upload before the reward was saved. Check the server log for the UploadThing route error."
          : error.message,
      );
    },
  });

  if (!isSignedIn) {
    return (
      <p className="text-sm font-semibold text-ink/60">
        Sign in with Clerk to upload reward images.
      </p>
    );
  }

  async function uploadFiles(files: FileList | File[]) {
    const file = Array.from(files).find((file) => file.type.startsWith("image/"));
    if (!file) {
      onError("Choose an image file to upload.");
      return;
    }

    setFileName(file.name);
    const uploadedFiles = await startUpload([file]);
    const uploadedFile = uploadedFiles?.at(0);
    if (!uploadedFile) return;

    const visual = uploadVisualFromFile(uploadedFile);
    if (!visual.imageUrl) {
      onError("Upload completed without an image URL.");
      return;
    }

    onUploaded(visual);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void uploadFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragActive(false);
    void uploadFiles(event.dataTransfer.files);
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Upload reward image file"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        disabled={isUploading}
        className={`grid w-full place-items-center rounded-lg border border-dashed px-4 py-5 text-center transition ${
          dragActive ? "border-teal bg-teal/5" : "border-ink/20 bg-paper/60 hover:border-teal"
        } disabled:cursor-wait disabled:opacity-70`}
      >
        <span className="grid h-12 w-12 place-items-center rounded-md bg-white text-teal shadow-sm">
          <UploadCloud aria-hidden className="h-7 w-7" />
        </span>
        <span className="mt-3 text-sm font-bold text-ink">
          {isUploading ? "Uploading image..." : "Drag image here or click to upload"}
        </span>
        <span className="mt-1 text-xs font-semibold text-ink/55">
          {fileName || "Images up to 4 MB"}
        </span>
      </button>
    </div>
  );
}

export function ParentRewardsPage() {
  const [form, setForm] = useState<RewardForm>(emptyForm);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const context = useQuery(api.households.currentContext);
  const activeHouseholdId =
    context?.household && context.parent.householdId === context.household._id
      ? context.household._id
      : null;
  const rewardsPage = usePaginatedQuery(
    api.rewards.list,
    activeHouseholdId ? { householdId: activeHouseholdId } : "skip",
    { initialNumItems: 100 },
  );
  const createReward = useMutation(api.rewards.create);
  const updateReward = useMutation(api.rewards.update);
  const sortedRewards = useMemo(
    () =>
      rewardsPage.results
        .slice()
        .sort((first, second) => Number(second.active) - Number(first.active)),
    [rewardsPage.results],
  );

  function resetMessages() {
    setError("");
    setStatusMessage("");
  }

  async function saveReward(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    if (!activeHouseholdId) {
      setError("Your parent account is not linked to this household.");
      return;
    }

    const pointsCost = Number(form.pointsCost);
    if (!form.title.trim()) {
      setError("Reward title is required.");
      return;
    }
    if (!Number.isFinite(pointsCost) || pointsCost < 0) {
      setError("Reward points cost cannot be negative.");
      return;
    }

    try {
      const visual = form.visual ?? { type: "icon" as const, iconKey: getRandomRewardIconKey() };
      if (form.rewardId) {
        await updateReward({
          householdId: activeHouseholdId,
          rewardId: form.rewardId,
          title: form.title,
          pointsCost,
          active: form.active,
          visual,
        });
        setStatusMessage("Reward saved.");
      } else {
        await createReward({
          householdId: activeHouseholdId,
          title: form.title,
          pointsCost,
          active: form.active,
          visual,
        });
        setStatusMessage("Reward created.");
      }
      setForm(emptyForm);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save reward.");
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.8fr_1fr]">
      <Card>
        <p className="text-sm font-black uppercase text-teal">Rewards</p>
        <h1 className="mt-2 text-4xl font-black">{context?.child?.pointsBalance ?? 0} points</h1>
        <p className="mt-2 text-sm font-semibold text-ink/60">
          Live balance for {context?.child?.name ?? "the child profile"}.
        </p>

        <form noValidate onSubmit={saveReward} className="mt-6 rounded-md bg-paper p-4">
          <p className="text-base font-black">{form.rewardId ? "Edit reward" : "New reward"}</p>
          <label htmlFor="reward-title" className="mt-4 block text-sm font-bold">
            Reward title
          </label>
          <input
            id="reward-title"
            value={form.title}
            onChange={(event) => {
              setForm((current) => ({ ...current, title: event.target.value }));
              resetMessages();
            }}
            className="mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3 text-base font-bold"
            aria-describedby={
              [error ? "reward-error" : "", statusMessage ? "reward-status" : ""]
                .filter(Boolean)
                .join(" ") || undefined
            }
          />

          <label htmlFor="reward-points-cost" className="mt-4 block text-sm font-bold">
            Points cost
          </label>
          <input
            id="reward-points-cost"
            value={form.pointsCost}
            type="number"
            min="0"
            inputMode="numeric"
            onChange={(event) => {
              setForm((current) => ({ ...current, pointsCost: event.target.value }));
              resetMessages();
            }}
            className="mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3 text-base font-bold"
          />

          <label className="mt-4 flex items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => {
                setForm((current) => ({ ...current, active: event.target.checked }));
                resetMessages();
              }}
              className="h-5 w-5 rounded border-ink/20"
            />
            Active
          </label>

          <div className="mt-5">
            <p className="text-sm font-bold">Reward visual</p>
            <div className="mt-3 flex items-center gap-4">
              {form.visual ? (
                <RewardVisual
                  visual={form.visual}
                  title={form.title || "Reward"}
                  className="h-16"
                />
              ) : (
                <div
                  className="grid aspect-square h-16 place-items-center rounded-md border border-dashed border-ink/20 bg-white text-ink/40"
                  aria-label="No reward visual selected"
                >
                  <Image aria-hidden className="h-7 w-7" />
                </div>
              )}
              <p className="text-sm text-ink/60">
                {form.visual
                  ? form.visual.type === "upload"
                    ? `Uploaded image: ${form.visual.imageName}`
                    : `Selected icon: ${form.visual.iconKey}`
                  : "A random icon will be chosen if you save without selecting one."}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {rewardIcons.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`Choose ${label} reward icon`}
                  aria-pressed={form.visual?.type === "icon" && form.visual.iconKey === key}
                  onClick={() => {
                    setForm((current) => ({ ...current, visual: { type: "icon", iconKey: key } }));
                    resetMessages();
                  }}
                  className="grid aspect-square place-items-center rounded-md border border-ink/15 bg-white text-coral transition hover:border-ink/40 aria-pressed:border-coral aria-pressed:bg-coral/10"
                >
                  <Icon aria-hidden className="h-6 w-6" />
                </button>
              ))}
            </div>

            <div className="mt-4">
              <RewardImageUpload
                onUploaded={(visual) => {
                  setForm((current) => ({ ...current, visual }));
                  setStatusMessage("Reward image uploaded.");
                  setError("");
                }}
                onError={(message) => {
                  setError(message);
                  setStatusMessage("");
                }}
              />
            </div>
          </div>

          {error ? (
            <p id="reward-error" className="mt-3 text-sm font-bold text-rose-700">
              {error}
            </p>
          ) : null}
          {statusMessage ? (
            <p id="reward-status" className="mt-3 text-sm font-bold text-teal">
              {statusMessage}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" disabled={!activeHouseholdId}>
              {form.rewardId ? "Save changes" : "Create reward"}
            </Button>
            {form.rewardId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setForm(emptyForm);
                  resetMessages();
                }}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="grid content-start gap-4 md:grid-cols-2">
        {sortedRewards.map((reward) => (
          <Card key={reward._id}>
            <div className="flex items-start justify-between gap-4">
              <RewardVisual
                visual={visualFromReward(reward)}
                title={reward.title}
                className="h-16 shrink-0"
              />
              <Button
                type="button"
                variant="quiet"
                aria-label={`Edit reward ${reward.title}`}
                onClick={() => {
                  setForm({
                    rewardId: reward._id,
                    title: reward.title,
                    pointsCost: String(reward.pointsCost),
                    active: reward.active,
                    visual: visualFromReward(reward),
                  });
                  resetMessages();
                }}
              >
                <Pencil aria-hidden className="h-4 w-4" />
                Edit
              </Button>
            </div>
            <h2 className="mt-4 text-xl font-black">{reward.title}</h2>
            <p className="mt-2 text-sm font-semibold text-ink/60">{reward.pointsCost} points</p>
            <p className="mt-3 text-sm font-bold text-ink/60">
              {reward.active ? "Active" : "Inactive"}
            </p>
            <p className="mt-4 text-sm text-ink/60">Redemption requests are a future milestone.</p>
          </Card>
        ))}
        {sortedRewards.length === 0 ? (
          <Card>
            <p className="font-black">No rewards yet.</p>
            <p className="mt-2 text-sm text-ink/60">Create a reward to show it here.</p>
          </Card>
        ) : null}
        {rewardsPage.status === "CanLoadMore" ? (
          <Button type="button" variant="secondary" onClick={() => rewardsPage.loadMore(50)}>
            Load more rewards
          </Button>
        ) : null}
      </div>
    </section>
  );
}
