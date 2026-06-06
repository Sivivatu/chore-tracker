import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readEnvFile(fileName: string) {
  const values: Record<string, string> = {};
  const path = resolve(process.cwd(), fileName);

  try {
    const contents = readFileSync(path, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (!key || valueParts.length === 0) continue;
      values[key.trim()] = valueParts.join("=").trim();
    }
  } catch {
    return values;
  }

  return values;
}

export function getE2EEnv() {
  const localEnv = readEnvFile(".env.local");
  const e2eEnv = readEnvFile(".env.e2e");
  const env = { ...localEnv, ...e2eEnv, ...process.env };

  return {
    authBypass: env.VITE_E2E_AUTH_BYPASS,
    clerkUserId: env.VITE_E2E_CLERK_USER_ID,
    convexUrl: env.VITE_CONVEX_URL,
  };
}
