import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: "node",
        include: [
            "src/domain/**/*.test.ts",
            "src/lib/**/*.test.ts",
            "src/server/**/*.test.ts",
        ],

    },
});