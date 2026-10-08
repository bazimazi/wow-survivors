import { createServer, preview } from "vite";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));

/** Vite binds atomically and advances to the next port on EADDRINUSE. */
export async function startLocalServer({
  port,
  open = false,
  production = false,
} = {}) {
  const firstPort = port ?? (production ? 4173 : 5678);
  if (!Number.isInteger(firstPort) || firstPort < 1 || firstPort > 65535)
    throw new Error("Starting port must be an integer from 1 to 65535.");
  const options = {
    host: "127.0.0.1",
    port: firstPort,
    strictPort: false,
    open,
  };
  const config = {
    root: projectRoot,
    configFile: false,
    clearScreen: false,
    logLevel: "error",
    server: options,
    preview: options,
  };
  const server = production
    ? await preview(config)
    : await createServer(config);
  try {
    if (!production) await server.listen();
    const url = server.resolvedUrls?.local[0];
    if (!url) throw new Error("Local server did not report its listening URL.");
    return { url, close: () => server.close() };
  } catch (error) {
    await server.close();
    throw error;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const args = process.argv.slice(2),
    portIndex = args.indexOf("--port");
  const server = await startLocalServer({
    port: portIndex < 0 ? undefined : Number(args[portIndex + 1]),
    production: args.includes("--preview"),
    open:
      args.includes("--open") &&
      !args.includes("--no-open") &&
      !args.includes("--test"),
  });
  console.log(`WOW_SURVIVORS_URL=${server.url}`);
  console.log(`Wow Survivors is ready at ${server.url}`);
  let closing = false;
  const stop = async () => {
    if (closing) return;
    closing = true;
    await server.close();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
