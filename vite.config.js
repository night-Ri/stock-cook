import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages はリポジトリ名によって公開URLのパスが変わるため、
  // 相対パスにしておくことでリポジトリ名を気にせずそのまま動く
  base: "./",
});
