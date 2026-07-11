import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Copy, Heart, Rocket, Smile, Sparkles, Star, UserPlus, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatBritishDateTime } from "@/lib/dates";
import type { Id } from "../../../convex/_generated/dataModel";

const avatarColours = ["#ffcf5a", "#14b8a6", "#38bdf8", "#f97316", "#a855f7", "#ef4444"];
const avatarPresets = [
  { key: "star", label: "Star", icon: Star },
  { key: "heart", label: "Heart", icon: Heart },
  { key: "smile", label: "Smile", icon: Smile },
  { key: "sparkles", label: "Sparkles", icon: Sparkles },
  { key: "rocket", label: "Rocket", icon: Rocket },
];

export function ParentSettingsPage() {
  const [pin, setPin] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");
  const [pinStatusMessage, setPinStatusMessage] = useState("");
  const [pinError, setPinError] = useState("");
  const context = useQuery(api.households.currentContext);
  const primaryChild = context?.child ?? context?.children?.at(0) ?? null;
  const parentLockStatus = useQuery(
    api.households.parentLockStatus,
    context?.household ? { householdId: context.household._id } : "skip",
  );
  const auditEvents = useQuery(
    api.auditEvents.list,
    context?.household ? { householdId: context.household._id } : "skip",
  );
  const choreSettings = useQuery(
    api.chores.getSettingsForHousehold,
    context?.household ? { householdId: context.household._id } : "skip",
  );
  const invitations = useQuery(
    api.parentInvitations.listForHousehold,
    context?.household ? { householdId: context.household._id } : "skip",
  );
  const setParentLockPin = useMutation(api.households.setParentLockPin);
  const createInvitation = useMutation(api.parentInvitations.create);
  const revokeInvitation = useMutation(api.parentInvitations.revoke);
  const upsertChoreSettings = useMutation(api.chores.upsertSettings);

  async function saveParentPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPinError("");
    setPinStatusMessage("");
    if (!context?.household) return;

    if (!/^\d{4,8}$/.test(pin.trim())) {
      setPinError("Use a 4 to 8 digit parent PIN.");
      return;
    }
    if (pin !== pinConfirmation) {
      setPinError("Parent PINs do not match.");
      return;
    }

    try {
      await setParentLockPin({ householdId: context.household._id, pin });
      setPin("");
      setPinConfirmation("");
      setPinStatusMessage("Parent PIN reset.");
    } catch (error) {
      setPinError(error instanceof Error ? error.message : "Could not save parent lock PIN.");
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.8fr_1fr]">
      <Card>
        <p className="text-sm font-black uppercase text-teal">Household</p>
        <h1 className="mt-2 text-3xl font-black">{context?.household.name ?? "Household"}</h1>
        <p className="mt-4 text-sm text-ink/60">Parent: {context?.parent.name ?? "Loading"}</p>
        <p className="text-sm text-ink/60">Child profile: {primaryChild?.name ?? "Loading"}</p>
        {context?.household ? (
          <ParentAccessForm
            householdId={context.household._id}
            parents={context.parents ?? [context.parent]}
            invitations={invitations ?? []}
            createInvitation={createInvitation}
            revokeInvitation={revokeInvitation}
          />
        ) : null}
        {context?.household ? (
          <HouseholdIdentityForm
            key={context.household._id}
            householdId={context.household._id}
            initialName={context.household.name}
          />
        ) : null}
        {context?.household ? (
          <HouseholdTimeZoneForm
            householdId={context.household._id}
            initialTimeZone={context.household.timeZone}
          />
        ) : null}
        {context?.household && context.parent ? (
          <ParentIdentityForm
            key={context.parent._id}
            householdId={context.household._id}
            initialName={context.parent.name}
          />
        ) : null}
        {context?.household && primaryChild ? (
          <ChildIdentityForm
            key={primaryChild._id}
            householdId={context.household._id}
            child={primaryChild}
          />
        ) : null}
        {context?.household ? (
          <ChoreSettingsForm
            key={`${context.household._id}-${choreSettings?.dailyMultiplier ?? "loading"}`}
            householdId={context.household._id}
            settings={choreSettings}
            upsertChoreSettings={upsertChoreSettings}
          />
        ) : null}
        <form onSubmit={saveParentPin} className="mt-6 rounded-md bg-paper p-4">
          <p className="text-base font-black">Reset parent PIN</p>
          <p className="mt-1 text-sm text-ink/60">
            {parentLockStatus?.configured
              ? "A parent PIN is set for leaving child mode."
              : "Set a parent PIN before using child mode on a shared device."}
          </p>
          <label htmlFor="parent-lock-pin" className="mt-4 block text-sm font-bold">
            New parent PIN
          </label>
          <input
            id="parent-lock-pin"
            value={pin}
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => {
              setPin(event.target.value);
              setPinError("");
              setPinStatusMessage("");
            }}
            className="mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3 text-lg font-bold"
            aria-describedby={
              [pinError ? "parent-lock-error" : "", pinStatusMessage ? "parent-lock-status" : ""]
                .filter(Boolean)
                .join(" ") || undefined
            }
          />
          <label htmlFor="parent-lock-pin-confirmation" className="mt-4 block text-sm font-bold">
            Confirm new parent PIN
          </label>
          <input
            id="parent-lock-pin-confirmation"
            value={pinConfirmation}
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => {
              setPinConfirmation(event.target.value);
              setPinError("");
              setPinStatusMessage("");
            }}
            className="mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3 text-lg font-bold"
          />
          {pinError ? (
            <p id="parent-lock-error" className="mt-2 text-sm font-bold text-rose-700">
              {pinError}
            </p>
          ) : null}
          {pinStatusMessage ? (
            <p id="parent-lock-status" className="mt-2 text-sm font-bold text-teal">
              {pinStatusMessage}
            </p>
          ) : null}
          <Button className="mt-4" type="submit" disabled={!context?.household || !pin}>
            Reset parent PIN
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="text-2xl font-black">Audit trail</h2>
        <ol className="mt-4 grid gap-3">
          {(auditEvents ?? []).map((event) => (
            <li key={event._id} className="rounded-md bg-paper p-3">
              <p className="font-semibold">{event.action}</p>
              <p className="text-sm text-ink/60">{formatBritishDateTime(event.createdAt)}</p>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}

function ParentAccessForm({
  householdId,
  parents,
  invitations,
  createInvitation,
  revokeInvitation,
}: {
  householdId: Id<"households">;
  parents: Array<{ _id: Id<"parents">; name: string }>;
  invitations: Array<{
    _id: Id<"parentInvitations">;
    expiresAt: string;
  }>;
  createInvitation: ReturnType<typeof useMutation<typeof api.parentInvitations.create>>;
  revokeInvitation: ReturnType<typeof useMutation<typeof api.parentInvitations.revoke>>;
}) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  async function create() {
    setError("");
    setStatusMessage("");
    try {
      const invitation = await createInvitation({ householdId });
      const url = `${window.location.origin}/invite/${invitation.token}`;
      setInviteUrl(url);
      await navigator.clipboard?.writeText(url);
      setStatusMessage("Invitation link created and copied.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create invitation.");
    }
  }

  async function copy() {
    await navigator.clipboard?.writeText(inviteUrl);
    setStatusMessage("Invitation link copied.");
  }

  async function revoke(invitationId: Id<"parentInvitations">) {
    setError("");
    try {
      await revokeInvitation({ invitationId });
      setInviteUrl("");
      setStatusMessage("Invitation revoked.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not revoke invitation.");
    }
  }

  return (
    <div className="mt-6 rounded-md bg-paper p-4">
      <p className="text-base font-black">Parent access</p>
      <ul className="mt-3 grid gap-2">
        {parents.map((parent) => (
          <li key={parent._id} className="rounded-md bg-white px-3 py-2 text-sm font-semibold">
            {parent.name}
          </li>
        ))}
      </ul>
      {inviteUrl ? (
        <div className="mt-4 flex gap-2">
          <input
            aria-label="Parent invitation link"
            readOnly
            value={inviteUrl}
            className="h-11 min-w-0 flex-1 rounded-md border border-ink/20 bg-white px-3 text-sm"
          />
          <Button type="button" onClick={() => void copy()}>
            <Copy aria-hidden className="h-4 w-4" /> Copy
          </Button>
        </div>
      ) : null}
      {invitations.map((invitation) => (
        <div key={invitation._id} className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span>Invite expires {formatBritishDateTime(invitation.expiresAt)}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-bold text-rose-700"
            onClick={() => void revoke(invitation._id)}
          >
            <X aria-hidden className="h-4 w-4" /> Revoke
          </button>
        </div>
      ))}
      {parents.length < 2 && invitations.length === 0 ? (
        <Button className="mt-4" type="button" onClick={() => void create()}>
          <UserPlus aria-hidden className="h-4 w-4" /> Invite another parent
        </Button>
      ) : null}
      {error ? <p className="mt-2 text-sm font-bold text-rose-700">{error}</p> : null}
      {statusMessage ? <p className="mt-2 text-sm font-bold text-teal">{statusMessage}</p> : null}
    </div>
  );
}

function ChoreSettingsForm({
  householdId,
  settings,
  upsertChoreSettings,
}: {
  householdId: Id<"households">;
  settings:
    | {
        dailyMultiplier: number;
        weeklyMultiplier: number;
        monthlyMultiplier: number;
      }
    | undefined;
  upsertChoreSettings: ReturnType<typeof useMutation<typeof api.chores.upsertSettings>>;
}) {
  const [dailyMultiplier, setDailyMultiplier] = useState(settings?.dailyMultiplier ?? 1);
  const [weeklyMultiplier, setWeeklyMultiplier] = useState(settings?.weeklyMultiplier ?? 3);
  const [monthlyMultiplier, setMonthlyMultiplier] = useState(settings?.monthlyMultiplier ?? 10);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  async function saveChoreSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatusMessage("");

    const values = [dailyMultiplier, weeklyMultiplier, monthlyMultiplier];
    if (values.some((value) => !Number.isInteger(value) || value < 0)) {
      setError("Chore multipliers must be non-negative whole numbers.");
      return;
    }

    try {
      await upsertChoreSettings({
        householdId,
        dailyMultiplier,
        weeklyMultiplier,
        monthlyMultiplier,
      });
      setStatusMessage("Chore multipliers saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save chore multipliers.");
    }
  }

  return (
    <form onSubmit={saveChoreSettings} noValidate className="mt-4 rounded-md bg-paper p-4">
      <p className="text-base font-black">Chore multipliers</p>
      <p className="mt-1 text-sm text-ink/60">
        Chore rewards use base points multiplied by these values.
      </p>
      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-3">
        <label htmlFor="daily-chore-multiplier" className="grid min-w-0 gap-2 text-sm font-bold">
          Daily
          <input
            id="daily-chore-multiplier"
            type="number"
            min={0}
            value={dailyMultiplier}
            onChange={(event) => {
              setDailyMultiplier(Number(event.target.value));
              setError("");
              setStatusMessage("");
            }}
            className="h-12 min-w-0 w-full rounded-md border border-ink/20 bg-white px-3 text-lg font-bold"
          />
        </label>
        <label htmlFor="weekly-chore-multiplier" className="grid min-w-0 gap-2 text-sm font-bold">
          Weekly
          <input
            id="weekly-chore-multiplier"
            type="number"
            min={0}
            value={weeklyMultiplier}
            onChange={(event) => {
              setWeeklyMultiplier(Number(event.target.value));
              setError("");
              setStatusMessage("");
            }}
            className="h-12 min-w-0 w-full rounded-md border border-ink/20 bg-white px-3 text-lg font-bold"
          />
        </label>
        <label htmlFor="monthly-chore-multiplier" className="grid min-w-0 gap-2 text-sm font-bold">
          Monthly
          <input
            id="monthly-chore-multiplier"
            type="number"
            min={0}
            value={monthlyMultiplier}
            onChange={(event) => {
              setMonthlyMultiplier(Number(event.target.value));
              setError("");
              setStatusMessage("");
            }}
            className="h-12 min-w-0 w-full rounded-md border border-ink/20 bg-white px-3 text-lg font-bold"
          />
        </label>
      </div>
      {error ? <p className="mt-2 text-sm font-bold text-rose-700">{error}</p> : null}
      {statusMessage ? <p className="mt-2 text-sm font-bold text-teal">{statusMessage}</p> : null}
      <Button className="mt-4" type="submit">
        Save chore multipliers
      </Button>
    </form>
  );
}

function HouseholdIdentityForm({
  householdId,
  initialName,
}: {
  householdId: Id<"households">;
  initialName: string;
}) {
  const [householdName, setHouseholdName] = useState(initialName);
  const [householdStatusMessage, setHouseholdStatusMessage] = useState("");
  const [householdError, setHouseholdError] = useState("");
  const updateHouseholdIdentity = useMutation(api.households.updateHouseholdIdentity);

  async function saveHouseholdIdentity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHouseholdError("");
    setHouseholdStatusMessage("");

    if (!householdName.trim()) {
      setHouseholdError("Household name is required.");
      return;
    }

    try {
      await updateHouseholdIdentity({ householdId, name: householdName });
      setHouseholdStatusMessage("Household identity saved.");
    } catch (error) {
      setHouseholdError(
        error instanceof Error ? error.message : "Could not save household identity.",
      );
    }
  }

  return (
    <form onSubmit={saveHouseholdIdentity} className="mt-6 rounded-md bg-paper p-4">
      <p className="text-base font-black">Family identity</p>
      <label htmlFor="household-name" className="mt-4 block text-sm font-bold">
        Household name
      </label>
      <input
        id="household-name"
        value={householdName}
        maxLength={80}
        onChange={(event) => {
          setHouseholdName(event.target.value);
          setHouseholdError("");
          setHouseholdStatusMessage("");
        }}
        className="mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3 text-lg font-bold"
        aria-describedby={
          [
            householdError ? "household-identity-error" : "",
            householdStatusMessage ? "household-identity-status" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {householdError ? (
        <p id="household-identity-error" className="mt-2 text-sm font-bold text-rose-700">
          {householdError}
        </p>
      ) : null}
      {householdStatusMessage ? (
        <p id="household-identity-status" className="mt-2 text-sm font-bold text-teal">
          {householdStatusMessage}
        </p>
      ) : null}
      <Button className="mt-4" type="submit">
        Save household
      </Button>
    </form>
  );
}

function HouseholdTimeZoneForm({
  householdId,
  initialTimeZone,
}: {
  householdId: Id<"households">;
  initialTimeZone: string;
}) {
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [message, setMessage] = useState("");
  const updateTimeZone = useMutation(api.households.updateHouseholdTimeZone);
  return <form className="mt-4 rounded-md bg-paper p-4" onSubmit={async (event) => {
    event.preventDefault(); setMessage("");
    try { await updateTimeZone({ householdId, timeZone }); setMessage("Timezone saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save timezone."); }
  }}>
    <label htmlFor="household-timezone" className="block text-sm font-bold">Household timezone</label>
    <select id="household-timezone" value={timeZone} onChange={(event) => setTimeZone(event.target.value)} className="mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3">
      {["Europe/London", "Europe/Dublin", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Australia/Sydney", "Pacific/Auckland"].map((zone) => <option key={zone}>{zone}</option>)}
    </select>
    <p className="mt-2 text-sm text-ink/60">Routine submission updates close at midnight in this timezone.</p>
    {message ? <p className="mt-2 text-sm font-bold text-teal" aria-live="polite">{message}</p> : null}
    <Button className="mt-4" type="submit">Save timezone</Button>
  </form>;
}

function ParentIdentityForm({
  householdId,
  initialName,
}: {
  householdId: Id<"households">;
  initialName: string;
}) {
  const [parentName, setParentName] = useState(initialName);
  const [parentStatusMessage, setParentStatusMessage] = useState("");
  const [parentError, setParentError] = useState("");
  const updateParentIdentity = useMutation(api.households.updateParentIdentity);

  async function saveParentIdentity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParentError("");
    setParentStatusMessage("");

    if (!parentName.trim()) {
      setParentError("Parent name is required.");
      return;
    }

    try {
      await updateParentIdentity({ householdId, name: parentName });
      setParentStatusMessage("Parent identity saved.");
    } catch (error) {
      setParentError(error instanceof Error ? error.message : "Could not save parent identity.");
    }
  }

  return (
    <form onSubmit={saveParentIdentity} className="mt-4 rounded-md bg-paper p-4">
      <p className="text-base font-black">Parent profile</p>
      <label htmlFor="parent-name" className="mt-4 block text-sm font-bold">
        Parent name
      </label>
      <input
        id="parent-name"
        value={parentName}
        maxLength={80}
        onChange={(event) => {
          setParentName(event.target.value);
          setParentError("");
          setParentStatusMessage("");
        }}
        className="mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3 text-lg font-bold"
        aria-describedby={
          [
            parentError ? "parent-identity-error" : "",
            parentStatusMessage ? "parent-identity-status" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {parentError ? (
        <p id="parent-identity-error" className="mt-2 text-sm font-bold text-rose-700">
          {parentError}
        </p>
      ) : null}
      {parentStatusMessage ? (
        <p id="parent-identity-status" className="mt-2 text-sm font-bold text-teal">
          {parentStatusMessage}
        </p>
      ) : null}
      <Button className="mt-4" type="submit">
        Save parent profile
      </Button>
    </form>
  );
}

function ChildIdentityForm({
  householdId,
  child,
}: {
  householdId: Id<"households">;
  child: {
    _id: Id<"children">;
    name: string;
    avatarColour: string;
    avatarPreset?: string;
  };
}) {
  const [childName, setChildName] = useState(child.name);
  const [avatarColour, setAvatarColour] = useState(child.avatarColour);
  const [avatarPreset, setAvatarPreset] = useState(child.avatarPreset ?? avatarPresets[0].key);
  const [childStatusMessage, setChildStatusMessage] = useState("");
  const [childError, setChildError] = useState("");
  const updateChildIdentity = useMutation(api.households.updateChildIdentity);
  const selectedAvatar = useMemo(
    () => avatarPresets.find((preset) => preset.key === avatarPreset) ?? avatarPresets[0],
    [avatarPreset],
  );
  const SelectedAvatarIcon = selectedAvatar.icon;

  async function saveChildIdentity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChildError("");
    setChildStatusMessage("");

    if (!childName.trim()) {
      setChildError("Child name is required.");
      return;
    }

    try {
      await updateChildIdentity({
        householdId,
        childId: child._id,
        name: childName,
        avatarColour,
        avatarPreset,
      });
      setChildStatusMessage("Child profile saved.");
    } catch (error) {
      setChildError(error instanceof Error ? error.message : "Could not save child profile.");
    }
  }

  return (
    <form onSubmit={saveChildIdentity} className="mt-4 rounded-md bg-paper p-4">
      <p className="text-base font-black">Child profile</p>
      <div className="mt-4 flex items-center gap-3">
        <span
          className="grid h-14 w-14 place-items-center rounded-md text-white shadow-sm"
          style={{ backgroundColor: avatarColour }}
          aria-hidden
        >
          <SelectedAvatarIcon className="h-7 w-7" />
        </span>
        <div>
          <p className="font-bold">{childName || "Child profile"}</p>
          <p className="text-sm text-ink/60">{selectedAvatar.label} avatar</p>
        </div>
      </div>
      <label htmlFor="child-name" className="mt-4 block text-sm font-bold">
        Child name
      </label>
      <input
        id="child-name"
        value={childName}
        maxLength={80}
        onChange={(event) => {
          setChildName(event.target.value);
          setChildError("");
          setChildStatusMessage("");
        }}
        className="mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3 text-lg font-bold"
      />
      <fieldset className="mt-4">
        <legend className="text-sm font-bold">Avatar colour</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {avatarColours.map((colour) => (
            <button
              key={colour}
              type="button"
              className="h-10 w-10 rounded-md border-2 border-white shadow-sm outline outline-ink/15 focus:outline-ink"
              style={{ backgroundColor: colour }}
              aria-label={`Use avatar colour ${colour}`}
              aria-pressed={avatarColour === colour}
              onClick={() => {
                setAvatarColour(colour);
                setChildError("");
                setChildStatusMessage("");
              }}
            />
          ))}
        </div>
      </fieldset>
      <label htmlFor="avatar-colour" className="mt-4 block text-sm font-bold">
        Custom avatar colour
      </label>
      <input
        id="avatar-colour"
        value={avatarColour}
        onChange={(event) => {
          setAvatarColour(event.target.value);
          setChildError("");
          setChildStatusMessage("");
        }}
        className="mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3 text-lg font-bold"
      />
      <fieldset className="mt-4">
        <legend className="text-sm font-bold">Avatar icon</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {avatarPresets.map((preset) => {
            const Icon = preset.icon;
            const selected = avatarPreset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                className={`grid h-11 w-11 place-items-center rounded-md border text-ink hover:bg-white ${
                  selected ? "border-ink bg-white" : "border-ink/15 bg-transparent"
                }`}
                aria-label={`Use ${preset.label} avatar`}
                aria-pressed={selected}
                title={preset.label}
                onClick={() => {
                  setAvatarPreset(preset.key);
                  setChildError("");
                  setChildStatusMessage("");
                }}
              >
                <Icon aria-hidden className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </fieldset>
      {childError ? <p className="mt-2 text-sm font-bold text-rose-700">{childError}</p> : null}
      {childStatusMessage ? (
        <p className="mt-2 text-sm font-bold text-teal">{childStatusMessage}</p>
      ) : null}
      <Button className="mt-4" type="submit">
        Save child profile
      </Button>
    </form>
  );
}
