import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParentRewardsPage } from "./rewards";

const convexState = vi.hoisted(() => ({
  createReward: vi.fn(),
  updateReward: vi.fn(),
  e2eBypass: false,
  context: {
    household: { _id: "household-1", name: "The Parker Household" },
    parent: { _id: "parent-1", householdId: "household-1", clerkUserId: "clerk-user-1" },
    child: { _id: "child-1", name: "Maya", pointsBalance: 42 },
  },
  rewards: [
    {
      _id: "reward-film",
      householdId: "household-1",
      title: "Family film night",
      pointsCost: 50,
      active: true,
      visualType: "icon",
      iconKey: "film",
    },
    {
      _id: "reward-baking",
      householdId: "household-1",
      title: "Weekend baking choice",
      pointsCost: 45,
      active: false,
      visualType: "upload",
      imageUrl: "https://example.com/baking.png",
      uploadThingKey: "baking-key",
      imageName: "baking.png",
    },
  ],
}));

vi.mock("convex/react", () => ({
  useMutation: (mutation: { _name?: string }) =>
    mutation._name?.includes("update") ? convexState.updateReward : convexState.createReward,
  usePaginatedQuery: () => ({
    results: convexState.rewards,
    status: "Exhausted",
    loadMore: vi.fn(),
  }),
  useQuery: (query: { _name?: string }) => {
    if (query._name?.includes("currentContext")) return convexState.context;
    return undefined;
  },
}));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("clerk-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/app/providers", () => ({
  hasClerkConfig: () => true,
  isE2EAuthBypass: () => convexState.e2eBypass,
}));

vi.mock("@/lib/uploadthing", () => ({
  useUploadThing: (
    _endpoint: string,
    options: {
      onUploadError: (error: Error) => void;
    },
  ) => ({
    isUploading: false,
    startUpload: vi.fn(async (files: File[]) => {
      if (files[0]?.name === "broken.png") {
        options.onUploadError(new Error("Upload failed"));
        return undefined;
      }
      if (files[0]?.name === "uploadthing-generic.png") {
        options.onUploadError(
          new Error("Something went wrong. Please report this to UploadThing."),
        );
        return undefined;
      }
      if (files[0]?.name === "direct.png") {
        return [
          {
            name: "direct.png",
            key: "direct-key",
            ufsUrl: "https://utfs.io/direct.png",
            serverData: null,
          },
        ];
      }
      if (files[0]?.name === "no-url.png") {
        return [
          {
            name: "no-url.png",
            key: "no-url-key",
            serverData: null,
          },
        ];
      }
      return [
        {
          name: files[0]?.name ?? "reward.png",
          key: "reward-key",
          ufsUrl: "https://example.com/reward.png",
          serverData: null,
        },
      ];
    }),
  }),
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    households: { currentContext: { _name: "currentContext" } },
    rewards: {
      list: { _name: "rewards.list" },
      create: { _name: "rewards.create" },
      update: { _name: "rewards.update" },
    },
  },
}));

describe("ParentRewardsPage", () => {
  beforeEach(() => {
    convexState.createReward.mockReset();
    convexState.updateReward.mockReset();
    convexState.e2eBypass = false;
    convexState.createReward.mockResolvedValue("reward-new");
    convexState.updateReward.mockResolvedValue("reward-film");
  });

  it("renders live rewards and child points", () => {
    render(<ParentRewardsPage />);

    expect(screen.getByText("42 points")).toBeInTheDocument();
    expect(screen.getByText("Live balance for Maya.")).toBeInTheDocument();
    expect(screen.getByText("Family film night")).toBeInTheDocument();
    expect(screen.getByText("50 points")).toBeInTheDocument();
    expect(screen.getByText("Weekend baking choice")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByTestId("reward-icon-film")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Weekend baking choice" })).toHaveAttribute(
      "src",
      "https://example.com/baking.png",
    );
  });

  it("creates a reward with a selected icon", async () => {
    const user = userEvent.setup();
    render(<ParentRewardsPage />);

    await user.type(screen.getByLabelText(/reward title/i), "Pick dinner");
    await user.type(screen.getByLabelText(/points cost/i), "30");
    await user.click(screen.getByRole("button", { name: /choose game reward icon/i }));
    await user.click(screen.getByRole("button", { name: /create reward/i }));

    expect(convexState.createReward).toHaveBeenCalledWith({
      householdId: "household-1",
      title: "Pick dinner",
      pointsCost: 30,
      active: true,
      visual: { type: "icon", iconKey: "game" },
    });
    expect(await screen.findByText("Reward created.")).toBeInTheDocument();
  });

  it("creates a reward with a random icon when no visual is selected", async () => {
    const user = userEvent.setup();
    render(<ParentRewardsPage />);

    await user.type(screen.getByLabelText(/reward title/i), "Pick dinner");
    await user.type(screen.getByLabelText(/points cost/i), "30");
    await user.click(screen.getByRole("button", { name: /create reward/i }));

    expect(convexState.createReward).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "household-1",
        title: "Pick dinner",
        visual: expect.objectContaining({ type: "icon", iconKey: expect.any(String) }),
      }),
    );
  });

  it("stores uploaded image metadata before saving", async () => {
    const user = userEvent.setup();
    render(<ParentRewardsPage />);

    await user.type(screen.getByLabelText(/reward title/i), "Choose breakfast");
    await user.type(screen.getByLabelText(/points cost/i), "20");
    await user.upload(
      screen.getByLabelText(/upload reward image file/i),
      new File(["image"], "reward.png", { type: "image/png" }),
    );
    expect(screen.getByText("Reward image uploaded.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create reward/i }));

    expect(convexState.createReward).toHaveBeenCalledWith(
      expect.objectContaining({
        visual: {
          type: "upload",
          imageUrl: "https://example.com/reward.png",
          uploadThingKey: "reward-key",
          imageName: "reward.png",
        },
      }),
    );
  });

  it("stores direct UploadThing file metadata when server data is not awaited", async () => {
    const user = userEvent.setup();
    render(<ParentRewardsPage />);

    await user.type(screen.getByLabelText(/reward title/i), "Choose card box");
    await user.type(screen.getByLabelText(/points cost/i), "20");
    await user.upload(
      screen.getByLabelText(/upload reward image file/i),
      new File(["image"], "direct.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: /create reward/i }));

    expect(convexState.createReward).toHaveBeenCalledWith(
      expect.objectContaining({
        visual: {
          type: "upload",
          imageUrl: "https://utfs.io/direct.png",
          uploadThingKey: "direct-key",
          imageName: "direct.png",
        },
      }),
    );
  });

  it("stores an e2e uploaded image as a persisted data URL", async () => {
    convexState.e2eBypass = true;
    const user = userEvent.setup();
    render(<ParentRewardsPage />);

    await user.type(screen.getByLabelText(/reward title/i), "Choose card box");
    await user.type(screen.getByLabelText(/points cost/i), "20");
    await user.upload(
      screen.getByLabelText(/upload reward image file/i),
      new File(["image"], "e2e.png", { type: "image/png" }),
    );
    await screen.findByText("Reward image uploaded.");
    await user.click(screen.getByRole("button", { name: /create reward/i }));

    expect(convexState.createReward).toHaveBeenCalledWith(
      expect.objectContaining({
        visual: expect.objectContaining({
          type: "upload",
          imageUrl: expect.stringMatching(/^data:image\/png;base64,/),
          uploadThingKey: "e2e-e2e.png",
          imageName: "e2e.png",
        }),
      }),
    );
  });

  it("blocks non-image files in e2e upload mode", async () => {
    convexState.e2eBypass = true;
    const user = userEvent.setup({ applyAccept: false });
    render(<ParentRewardsPage />);

    await user.upload(
      screen.getByLabelText(/upload reward image file/i),
      new File(["text"], "notes.txt", { type: "text/plain" }),
    );

    expect(screen.getByText("Choose an image file to upload.")).toBeInTheDocument();
  });

  it("shows upload failures inline", async () => {
    const user = userEvent.setup();
    render(<ParentRewardsPage />);

    await user.upload(
      screen.getByLabelText(/upload reward image file/i),
      new File(["image"], "broken.png", { type: "image/png" }),
    );

    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("shows an error when UploadThing completes without an image URL", async () => {
    const user = userEvent.setup();
    render(<ParentRewardsPage />);

    await user.upload(
      screen.getByLabelText(/upload reward image file/i),
      new File(["image"], "no-url.png", { type: "image/png" }),
    );

    expect(screen.getByText("Upload completed without an image URL.")).toBeInTheDocument();
  });

  it("shows a helpful UploadThing configuration message for generic upload failures", async () => {
    const user = userEvent.setup();
    render(<ParentRewardsPage />);

    await user.upload(
      screen.getByLabelText(/upload reward image file/i),
      new File(["image"], "uploadthing-generic.png", { type: "image/png" }),
    );

    expect(
      screen.getByText(
        "UploadThing rejected the upload before the reward was saved. Check the server log for the UploadThing route error.",
      ),
    ).toBeInTheDocument();
  });

  it("edits an existing reward", async () => {
    const user = userEvent.setup();
    render(<ParentRewardsPage />);

    await user.click(screen.getByRole("button", { name: /edit reward family film night/i }));
    await user.clear(screen.getByLabelText(/reward title/i));
    await user.type(screen.getByLabelText(/reward title/i), "Cinema trip");
    await user.clear(screen.getByLabelText(/points cost/i));
    await user.type(screen.getByLabelText(/points cost/i), "60");
    await user.click(screen.getByLabelText(/active/i));
    await user.click(screen.getByRole("button", { name: /choose book reward icon/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(convexState.updateReward).toHaveBeenCalledWith({
      householdId: "household-1",
      rewardId: "reward-film",
      title: "Cinema trip",
      pointsCost: 60,
      active: false,
      visual: { type: "icon", iconKey: "book" },
    });
    expect(await screen.findByText("Reward saved.")).toBeInTheDocument();
  });

  it("blocks invalid rewards", async () => {
    const user = userEvent.setup();
    render(<ParentRewardsPage />);

    await user.click(screen.getByRole("button", { name: /create reward/i }));

    expect(screen.getByText("Reward title is required.")).toBeInTheDocument();
    expect(convexState.createReward).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/reward title/i), "Extra screen time");
    await user.clear(screen.getByLabelText(/points cost/i));
    await user.type(screen.getByLabelText(/points cost/i), "-1");
    await user.click(screen.getByRole("button", { name: /create reward/i }));

    expect(screen.getByText("Reward points cost cannot be negative.")).toBeInTheDocument();
    expect(convexState.createReward).not.toHaveBeenCalled();
  });

  it("shows backend save failures", async () => {
    convexState.createReward.mockRejectedValue(new Error("Backend rejected reward"));
    const user = userEvent.setup();
    render(<ParentRewardsPage />);

    await user.type(screen.getByLabelText(/reward title/i), "Choose bedtime story");
    await user.type(screen.getByLabelText(/points cost/i), "15");
    await user.click(screen.getByRole("button", { name: /create reward/i }));

    expect(await screen.findByText("Backend rejected reward")).toBeInTheDocument();
  });
});
