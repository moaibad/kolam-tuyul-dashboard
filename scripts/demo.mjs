import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const child = spawn(process.execPath, [nextBin, "dev"], {
  env: {
    ...process.env,
    DEMO_MODE: "true",
  },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Unable to start the demo server:", error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
