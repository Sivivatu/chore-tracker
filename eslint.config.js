import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "build",
      "coverage",
      "dist",
      "node_modules",
      "playwright-report",
      "test-results",
      ".react-router",
      ".vercel",
      "convex/_generated",
    ],
  },
  {
    languageOptions: {
      globals: {
        ArrayBuffer: "readonly",
        Buffer: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        crypto: "readonly",
        document: "readonly",
        File: "readonly",
        FileList: "readonly",
        FileReader: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        HTMLButtonElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLInputElement: "readonly",
        localStorage: "readonly",
        MouseEvent: "readonly",
        Node: "readonly",
        process: "readonly",
        React: "readonly",
        Request: "readonly",
        Response: "readonly",
        sessionStorage: "readonly",
        setTimeout: "readonly",
        TouchEvent: "readonly",
        URL: "readonly",
        window: "readonly",
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
);
