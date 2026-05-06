#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connect } from "./cdp.js";
import {
 applyDevicePreset,
 clearDeviceEmulation,
 listDevicePresets,
 resolveDevicePreset,
} from "./devices.js";
import { applyActiveEmulation } from "./emulation-state.js";

const DEBUG = process.env.DEBUG === "1";
const log = DEBUG ? (...args) => console.error("[debug]", ...args) : () => {};

function printUsage() {
 console.log("Usage: screenshot.js [--full-page] [--device <name>] [--landscape]");
 console.log("\nExamples:");
 console.log(" screenshot.js");
 console.log(" screenshot.js --full-page");
 console.log(" screenshot.js --device iphone-14");
 console.log(" screenshot.js --device pixel-7 --full-page");
}

const args = process.argv.slice(2);
let fullPage = false;
let landscape = false;
let deviceName = null;

for (let i = 0; i < args.length; i++) {
 if (args[i] === "--full-page") {
 fullPage = true;
 } else if (args[i] === "--landscape") {
 landscape = true;
 } else if (args[i] === "--device" && i + 1 < args.length) {
 deviceName = args[++i];
 } else if (args[i] === "--help" || args[i] === "-h") {
 printUsage();
 process.exit(0);
 } else {
 console.error(`✗ Unknown option: ${args[i]}`);
 printUsage();
 process.exit(1);
 }
}

const preset = deviceName ? resolveDevicePreset(deviceName) : null;

if (deviceName && !preset) {
 console.error(`✗ Unknown device preset: ${deviceName}`);
 console.error(" Available presets:");
 for (const item of listDevicePresets()) {
 console.error(` - ${item.id}`);
 }
 process.exit(1);
}

// Global timeout
const globalTimeout = setTimeout(() => {
 console.error("✗ Global timeout exceeded (30s)");
 process.exit(1);
}, 30000);

let cdp = null;

try {
 log("connecting...");
 cdp = await connect(5000);

 log("getting pages...");
 const pages = await cdp.getPages();
 const page = pages.at(-1);

 if (!page) {
 console.error("✗ No active tab found");
 process.exit(1);
 }

 log("attaching to page...");
 const sessionId = await cdp.attachToPage(page.targetId);

 let temporaryEmulationApplied = false;

 try {
 if (preset) {
 log("applying temporary device emulation...");
 await applyDevicePreset(cdp, sessionId, preset, { landscape });
 temporaryEmulationApplied = true;
 } else {
 log("applying active emulation (if configured)...");
 await applyActiveEmulation(cdp, sessionId);
 }

 let params = { format: "png" };

 if (fullPage) {
 log("reading layout metrics...");
 const metrics = await cdp.send("Page.getLayoutMetrics", {}, sessionId, 10000);
 const contentSize = metrics.cssContentSize || metrics.contentSize;

 if (!contentSize) {
 throw new Error("Could not determine page size for full-page screenshot");
 }

 params = {
 ...params,
 fromSurface: true,
 captureBeyondViewport: true,
 clip: {
 x: 0,
 y: 0,
 width: Math.max(1, Math.ceil(contentSize.width)),
 height: Math.max(1, Math.ceil(contentSize.height)),
 scale: 1,
 },
 };
 }

 log("taking screenshot...");
 const { data } = await cdp.send(
 "Page.captureScreenshot",
 params,
 sessionId,
 fullPage ? 20000 : 10000,
 );

 const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
 const filename = `screenshot-${timestamp}.png`;
 const filepath = join(tmpdir(), filename);

 writeFileSync(filepath, Buffer.from(data, "base64"));
 console.log(filepath);
 } finally {
 if (temporaryEmulationApplied) {
 try {
 log("clearing temporary device emulation...");
 await clearDeviceEmulation(cdp, sessionId);
 } catch (e) {
 log("failed to clear device emulation", e.message);
 }
 }
 }

 log("closing...");
 cdp.close();
 log("done");
} catch (e) {
 console.error("✗", e.message);
 process.exit(1);
} finally {
 clearTimeout(globalTimeout);
 if (cdp) {
 try {
 cdp.close();
 } catch {
 // ignore
 }
 }
 setTimeout(() => process.exit(0), 100);
}
