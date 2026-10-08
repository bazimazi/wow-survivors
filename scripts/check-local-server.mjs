import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { projectRoot, startLocalServer } from "./local-server.mjs";
import { openCaptureSession } from "./capture-session.mjs";

async function occupy(port) {
  const sockets = new Set();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    socket.end("occupied");
  });
  const owned = await new Promise((resolve, reject) => {
    server.once("error", (error) =>
      error.code === "EADDRINUSE" ? resolve(false) : reject(error),
    );
    server.listen(port, "127.0.0.1", () => resolve(true));
  });
  return {
    close: async () => {
      for (const socket of sockets) socket.destroy();
      if (owned && server.listening)
        await new Promise((done) => server.close(done));
    },
  };
}

async function cli(args) {
  const child = spawn(
    process.execPath,
    ["scripts/local-server.mjs", "--no-open", ...args],
    { cwd: projectRoot },
  );
  let output = "";
  const finished = new Promise((done) => child.once("exit", done));
  try {
    const url = await new Promise((done, reject) => {
      const timeout = setTimeout(
        () => reject(Error(`Server readiness timed out: ${output}`)),
        30_000,
      );
      child.once("error", reject);
      child.once("exit", (code) => {
        clearTimeout(timeout);
        reject(Error(`Server exited ${code}: ${output}`));
      });
      child.stderr.on("data", (chunk) => (output += chunk));
      child.stdout.on("data", (chunk) => {
        output += chunk;
        const match = /WOW_SURVIVORS_URL=(http:\/\/127\.0\.0\.1:\d+\/)/.exec(
          output,
        );
        if (match) {
          clearTimeout(timeout);
          done(match[1]);
        }
      });
    });
    return {
      url,
      close: async () => {
        child.kill();
        await finished;
      },
    };
  } catch (error) {
    child.kill();
    await finished;
    throw error;
  }
}

await mkdir(resolve(projectRoot, "output"), { recursive: true });
const reports = [];
const blocker = await occupy(5173);
try {
  for (const [mode, args, preferred] of [
    ["dev", [], 5173],
    ["preview", ["--preview"], 4173],
  ]) {
    const previewBlocker = mode === "preview" ? await occupy(preferred) : null;
    let server;
    try {
      server = await cli(args);
      assert.ok(Number(new URL(server.url).port) > preferred);
      assert.match(await (await fetch(server.url)).text(), /Wow Survivors/);
      reports.push({ mode, preferred, url: server.url, fallback: true });
    } finally {
      await server?.close();
      await previewBlocker?.close();
    }
    await assert.rejects(fetch(server.url));
  }

  const originalOverride = process.env.WOW_SURVIVORS_URL;
  delete process.env.WOW_SURVIVORS_URL;
  try {
    const capture = await openCaptureSession();
    try {
      assert.ok(Number(new URL(capture.url).port) > 5173);
      const page = await capture.browser.newPage();
      await page.goto(capture.url);
      await page
        .getByRole("button", { name: "Begin Expedition", exact: true })
        .waitFor();
      reports.push({
        mode: "capture-owned",
        url: capture.url,
        gameLoaded: true,
      });
    } finally {
      await capture.close();
    }
    await assert.rejects(fetch(capture.url));

    const external = await startLocalServer();
    try {
      process.env.WOW_SURVIVORS_URL = external.url;
      const capture = await openCaptureSession();
      try {
        assert.equal(capture.url, external.url);
        const page = await capture.browser.newPage();
        await page.goto(capture.url);
        await page
          .getByRole("button", { name: "Begin Expedition", exact: true })
          .waitFor();
      } finally {
        await capture.close();
      }
      assert.equal((await fetch(external.url)).status, 200);
      reports.push({
        mode: "capture-external",
        url: external.url,
        retained: true,
      });
    } finally {
      await external.close();
    }
  } finally {
    if (originalOverride === undefined) delete process.env.WOW_SURVIVORS_URL;
    else process.env.WOW_SURVIVORS_URL = originalOverride;
  }

  if (process.argv.includes("--browser")) {
    const child = spawn(
      process.execPath,
      ["node_modules/@playwright/test/cli.js", "test"],
      { cwd: projectRoot },
    );
    let output = "";
    const forward = (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    };
    child.stdout.on("data", forward);
    child.stderr.on("data", forward);
    const code = await new Promise((done, reject) => {
      child.once("error", reject);
      child.once("exit", done);
    });
    await writeFile(resolve(projectRoot, "output/browser-0.18.log"), output);
    assert.equal(
      code,
      0,
      "Browser suite must pass with the preferred port occupied.",
    );
    const match = /WOW_SURVIVORS_URL=(http:\/\/127\.0\.0\.1:\d+\/)/.exec(
      output,
    );
    assert.ok(match, "Playwright must report its captured actual URL.");
    assert.ok(Number(new URL(match[1]).port) > 5173);
    reports.push({ mode: "playwright", url: match[1], passed: true });
  }
  await writeFile(
    resolve(projectRoot, "output/server-0.18.json"),
    JSON.stringify(reports, null, 2) + "\n",
  );
  console.log("Free-port and capture checks passed:", JSON.stringify(reports));
} finally {
  await blocker.close();
}
