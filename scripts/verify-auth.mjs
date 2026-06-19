import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClerkClient } from "@clerk/backend";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Environment file not found: ${filePath}`);
  }

  const values = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function commandLineValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function required(values, name) {
  const value = values[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function normaliseUrl(value) {
  return new URL(value).origin;
}

function decodePublishableKeyDomain(publishableKey) {
  const match = publishableKey.match(/^pk_(?:test|live)_(.+)$/);
  if (!match) throw new Error("VITE_CLERK_PUBLISHABLE_KEY has an invalid format");

  const encoded = match[1].replace(/\$$/, "");
  return Buffer.from(encoded, "base64url").toString("utf8").replace(/\$$/, "");
}

async function main() {
  const envFile = commandLineValue("--env-file");
  const fileValues = envFile ? parseEnvFile(path.resolve(envFile)) : {};
  const values = { ...fileValues, ...process.env };

  const publishableKey = required(values, "VITE_CLERK_PUBLISHABLE_KEY");
  const secretKey = required(values, "CLERK_SECRET_KEY");
  const issuer = normaliseUrl(required(values, "CLERK_JWT_ISSUER_DOMAIN"));
  const publishableKeyDomain = decodePublishableKeyDomain(publishableKey);

  if (publishableKeyDomain !== new URL(issuer).host) {
    throw new Error(
      `Clerk key domain ${publishableKeyDomain} does not match issuer ${new URL(issuer).host}`,
    );
  }

  const oidcResponse = await globalThis.fetch(`${issuer}/.well-known/openid-configuration`);
  if (!oidcResponse.ok) {
    throw new Error(`Clerk OIDC discovery returned HTTP ${oidcResponse.status}`);
  }
  const oidc = await oidcResponse.json();
  if (normaliseUrl(oidc.issuer) !== issuer || !oidc.jwks_uri) {
    throw new Error("Clerk OIDC discovery does not match the configured issuer");
  }

  const clerk = createClerkClient({ secretKey });
  const [templates, waitlist] = await Promise.all([
    clerk.jwtTemplates.list({ limit: 100, paginated: true }),
    clerk.waitlistEntries.list({ limit: 1 }),
  ]);
  const convexTemplate = templates.data.find((template) => template.name === "convex");

  if (!convexTemplate) {
    throw new Error(
      'Clerk does not have a "convex" JWT template. Activate the Convex integration before deploying.',
    );
  }
  if (convexTemplate.claims.aud !== "convex") {
    throw new Error('The Clerk "convex" JWT template must set the audience claim to "convex"');
  }

  console.log("Clerk and Convex authentication configuration is valid.");
  console.log(
    `- Clerk environment: ${publishableKey.startsWith("pk_live_") ? "production" : "development"}`,
  );
  console.log(`- Clerk issuer: ${issuer}`);
  console.log('- JWT template: convex (audience "convex")');
  console.log(`- Waitlist API: available (${waitlist.totalCount} entries)`);
}

main().catch((error) => {
  console.error(`Authentication verification failed: ${error.message}`);
  process.exitCode = 1;
});
