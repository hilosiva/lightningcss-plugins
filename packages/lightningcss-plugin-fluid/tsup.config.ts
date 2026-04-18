import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    minify: true,
    sourcemap: true,
    clean: true,
    cjsInterop: true,
    external: [],
    target: "es2020",
  },

]);
