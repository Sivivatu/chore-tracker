import { verifyToken } from "@clerk/backend";
import {
  createRouteHandler,
  createUploadthing,
  type FileRouter,
  UploadThingError,
} from "uploadthing/server";

const f = createUploadthing();

type ClerkVerifyResult = {
  data?: ClerkVerifiedToken;
  errors?: ClerkVerifyError[];
};

type ClerkVerifiedToken = {
  sub?: unknown;
};

type ClerkVerifyError = {
  message: string;
};

function normaliseClerkVerifyResult(result: unknown) {
  if (result && typeof result === "object" && ("data" in result || "errors" in result)) {
    const wrapped = result as ClerkVerifyResult;
    return {
      subject: typeof wrapped.data?.sub === "string" ? wrapped.data.sub : null,
      errors: wrapped.errors,
    };
  }

  const payload = result as ClerkVerifiedToken | null;
  return {
    subject: typeof payload?.sub === "string" ? payload.sub : null,
    errors: undefined,
  };
}

function describeTokenForLogs(token: string) {
  const [, payload] = token.split(".");
  if (!payload) return { tokenShape: "not-jwt" };

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      azp?: unknown;
      exp?: unknown;
      iss?: unknown;
      sub?: unknown;
    };
    return {
      tokenShape: "jwt",
      issuer: typeof decoded.iss === "string" ? decoded.iss : null,
      authorisedParty: typeof decoded.azp === "string" ? decoded.azp : null,
      expired: typeof decoded.exp === "number" ? decoded.exp * 1000 < Date.now() : null,
      hasSubject: typeof decoded.sub === "string",
    };
  } catch {
    return { tokenShape: "jwt-unreadable" };
  }
}

function getE2EUploadUserId() {
  if (process.env.E2E_AUTH_BYPASS !== "true") return null;
  return process.env.E2E_CLERK_USER_ID ?? "e2e_parent";
}

export const uploadRouter = {
  rewardImageUploader: f(
    {
      image: {
        maxFileSize: "4MB",
        maxFileCount: 1,
      },
    },
    { awaitServerData: false },
  )
    .middleware(async ({ req }) => {
      const e2eUserId = getE2EUploadUserId();
      if (e2eUserId) return { uploadedBy: e2eUserId };

      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

      if (!token) {
        throw new UploadThingError("Missing upload authorisation");
      }

      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey) {
        throw new UploadThingError("Upload authorisation is not configured");
      }

      let verified: ReturnType<typeof normaliseClerkVerifyResult>;
      try {
        verified = normaliseClerkVerifyResult(await verifyToken(token, { secretKey }));
      } catch (error) {
        verified = {
          subject: null,
          errors: [
            {
              message: error instanceof Error ? error.message : "Token verification failed",
            },
          ],
        };
      }

      if (verified.errors?.length || !verified.subject) {
        const details =
          verified.errors?.map((error) => error.message).join("; ") ?? "Missing verified subject";
        console.error("Upload authorisation failed", details, describeTokenForLogs(token));
        throw new UploadThingError(
          process.env.NODE_ENV === "production"
            ? "Invalid upload authorisation"
            : `Invalid upload authorisation: ${details}`,
        );
      }

      return { uploadedBy: verified.subject };
    })
    .onUploadComplete(({ file, metadata }) => ({
      uploadedBy: metadata.uploadedBy,
      imageUrl: file.ufsUrl,
      uploadThingKey: file.key,
      imageName: file.name,
    })),
} satisfies FileRouter;

const handler = createRouteHandler({
  router: uploadRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN,
  },
});

export function handleUploadThingRequest(request: Request) {
  return handler(request);
}

export default handleUploadThingRequest;

export function GET(request: Request) {
  return handleUploadThingRequest(request);
}

export function POST(request: Request) {
  return handleUploadThingRequest(request);
}

export type OurFileRouter = typeof uploadRouter;
