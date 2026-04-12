import { defineConfig, type UserConfig } from "vite";
import { resolve } from "path";

export default defineConfig(({ mode }): UserConfig => {
  const isContentBuild = mode === "content";

  if (isContentBuild) {
    return {
      build: {
        outDir: "dist",
        emptyOutDir: true,
        cssCodeSplit: true,
        rollupOptions: {
          input: resolve(__dirname, "src/content/content.ts"),
          output: {
            inlineDynamicImports: true,
            entryFileNames: "content.js",
            chunkFileNames: "assets/[name].js",
            assetFileNames: (assetInfo) => {
              if (assetInfo.name?.endsWith(".css")) {
                return "assets/content.css";
              }
              return "assets/[name].[ext]";
            }
          }
        }
      }
    };
  }

  return {
    build: {
      outDir: "dist",
      emptyOutDir: false,
      rollupOptions: {
        input: {
          background: resolve(__dirname, "src/background/service-worker.ts"),
          popup: resolve(__dirname, "src/popup/popup.html")
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === "background") return "background.js";
            return "assets/[name].js";
          },
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name].[ext]"
        }
      }
    }
  };
});