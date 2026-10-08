import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { startLocalServer } from "../scripts/local-server.mjs";

test("an occupied starting port falls back without taking over another service", async () => {
  const blocker = createServer((socket) => socket.end("occupied"));
  await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", resolve));
  const port = (blocker.address() as { port: number }).port;
  let server;
  try {
    server = await startLocalServer({ port });
    assert.ok(Number(new URL(server.url).port) > port);
    assert.equal((blocker.address() as { port: number }).port, port);
    const response = await fetch(server.url);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Wow Survivors/);
  } finally {
    await server?.close();
    await new Promise<void>((resolve) => blocker.close(() => resolve()));
  }
  await assert.rejects(fetch(server!.url));
});

test("two servers requesting the same preferred port bind separate game URLs and close independently", async () => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  const a = await startLocalServer({ port });
  let b;
  try {
    b = await startLocalServer({ port });
    assert.notEqual(a.url, b.url);
    assert.ok(Number(new URL(b.url).port) > Number(new URL(a.url).port));
    await a.close();
    assert.equal((await fetch(b.url)).status, 200);
  } finally {
    await a.close();
    await b?.close();
  }
});

test("invalid starting ports fail before a server is opened", async () => {
  for (const port of [0, -1, 1.5, 65536, NaN])
    await assert.rejects(startLocalServer({ port }), /Starting port/);
});
