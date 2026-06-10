import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import type { IncomingMessage } from "node:http";
import { loadEnv, type Plugin } from "vite";

async function nodeRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

function uploadThingDevApiPlugin(): Plugin {
  return {
    name: "uploadthing-dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/uploadthing", async (request, response) => {
        try {
          const { handleUploadThingRequest } = await import("./api/uploadthing");
          const host = request.headers.host ?? "localhost:5173";
          const protocol = request.headers["x-forwarded-proto"]?.toString() ?? "http";
          const url = new URL(`/api/uploadthing${request.url ?? ""}`, `${protocol}://${host}`);
          const body =
            request.method === "GET" || request.method === "HEAD"
              ? undefined
              : await nodeRequestBody(request);
          const webRequest = new Request(url, {
            method: request.method,
            headers: request.headers as HeadersInit,
            body,
          });
          const webResponse = await handleUploadThingRequest(webRequest);

          response.statusCode = webResponse.status;
          webResponse.headers.forEach((value, key) => response.setHeader(key, value));

          if (webResponse.body) {
            const bodyBuffer = Buffer.from(await webResponse.arrayBuffer());
            response.end(bodyBuffer);
          } else {
            response.end();
          }
        } catch (error) {
          server.config.logger.error(
            error instanceof Error ? (error.stack ?? error.message) : String(error),
          );
          response.statusCode = 500;
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify({ error: "UploadThing dev endpoint failed" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.CLERK_SECRET_KEY) process.env.CLERK_SECRET_KEY = env.CLERK_SECRET_KEY;
  if (env.UPLOADTHING_TOKEN) process.env.UPLOADTHING_TOKEN = env.UPLOADTHING_TOKEN;
  if (env.E2E_AUTH_BYPASS ?? env.VITE_E2E_AUTH_BYPASS) {
    process.env.E2E_AUTH_BYPASS = env.E2E_AUTH_BYPASS ?? env.VITE_E2E_AUTH_BYPASS;
  }
  if (env.E2E_CLERK_USER_ID ?? env.VITE_E2E_CLERK_USER_ID) {
    process.env.E2E_CLERK_USER_ID = env.E2E_CLERK_USER_ID ?? env.VITE_E2E_CLERK_USER_ID;
  }

  return {
    plugins: [uploadThingDevApiPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    test: {
      include: ["src/**/*.test.{ts,tsx}"],
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        thresholds: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        exclude: ["convex/_generated/**", "src/main.tsx", "src/routeTree.gen.ts", "src/test/**"],
      },
    },
  };
});
