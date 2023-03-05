import { defineConfig } from "npm:vite@^3.2.5";
import react from "npm:@vitejs/plugin-react@^2.2.0";

import "npm:react@^17.0.2";
import "npm:react-dom@^17.0.2";
import "npm:react-router-dom@^5.1.2";

import "npm:mobx@^6.4.0";
import "npm:mobx-react@^7.6.0";

import "npm:express@4.17.1";
import "npm:socket.io-client@^2.3.0";
import "npm:classnames@^2.2.6";
import "npm:markdown-it@12.0.4";
import "npm:chalk@^3.0.0";
import path from "npm:path";

export default defineConfig({
  plugins: [
    react({
      babel: {
        parserOpts: {
          plugins: ["decorators-legacy"],
        },
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 2020,
    https: false,
    strictPort: true,
    // hmr: {
    //   port: 80,
    //   host: "0.0.0.0",
    //   protocol: "wss",
    // },
    open: "/index.html",
    cors: true,
  },
  base: "./",
  build: {
    outDir: "dist",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
