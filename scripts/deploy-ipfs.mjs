#!/usr/bin/env node
/**
 * ethvideos.eth — Deploy to IPFS via Pinata
 *
 * Usage:
 *   node scripts/deploy-ipfs.mjs
 *
 * What it does:
 *   1. Builds Next.js normally (works around output: export bugs in Next.js 15)
 *   2. Assembles a static out/ directory from .next server output + assets
 *   3. Uploads the entire out/ folder to Pinata
 *   4. Prints the IPFS CID — set this as the contenthash on app.ethvideos.eth
 */

import { execSync } from "child_process";
import {
  readFileSync, readdirSync, statSync, existsSync,
  mkdirSync, copyFileSync, writeFileSync,
} from "fs";
import { join, relative, dirname } from "path";
import { createReadStream } from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

// ─── Load env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  const envFile = join(process.cwd(), ".env.local");
  if (!existsSync(envFile)) {
    console.error("❌  .env.local not found");
    process.exit(1);
  }
  const lines = readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] = process.env[key] ?? val;
  }
}

loadEnv();

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
if (!PINATA_JWT) {
  console.error("❌  NEXT_PUBLIC_PINATA_JWT is missing from .env.local");
  process.exit(1);
}

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "out");
const NEXT_DIR = join(ROOT, ".next");

// ─── Step 1: Build ─────────────────────────────────────────────────────────────
console.log("\n🔨  Building Next.js...\n");

try {
  execSync("npm run build", { stdio: "inherit", cwd: ROOT });
} catch {
  console.error("\n❌  Build failed. Fix errors above and retry.");
  process.exit(1);
}

// ─── Step 2: Assemble static out/ directory ────────────────────────────────────
console.log("\n📁  Assembling static output directory...\n");

// Remove old out/ and recreate
execSync(`rm -rf "${OUT_DIR}" && mkdir -p "${OUT_DIR}"`, { stdio: "inherit" });

// Helper: copy file, creating parent dirs as needed
function copyFile(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

// Helper: copy entire directory tree
function copyDir(srcDir, destDir) {
  if (!existsSync(srcDir)) return;
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

// 2a. Copy _next/static assets
const staticSrc = join(NEXT_DIR, "static");
const staticDest = join(OUT_DIR, "_next", "static");
copyDir(staticSrc, staticDest);
console.log("  ✓ Copied _next/static/");

// 2b. Copy public/ files (icons, images, etc.)
const publicSrc = join(ROOT, "public");
if (existsSync(publicSrc)) {
  copyDir(publicSrc, OUT_DIR);
  console.log("  ✓ Copied public/");
}

// 2c. Copy pre-rendered HTML pages from .next/server/app/
const serverAppDir = join(NEXT_DIR, "server", "app");

function copyHtmlPages(srcDir, destDir) {
  if (!existsSync(srcDir)) return;
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = join(srcDir, entry.name);
    if (entry.isDirectory()) {
      // Skip API directories and dynamic segment dirs
      if (entry.name === "api" || entry.name.startsWith("[")) continue;
      copyHtmlPages(srcPath, join(destDir, entry.name));
    } else if (entry.name.endsWith(".html")) {
      // Convert page.html → directory/index.html
      const baseName = entry.name.replace(".html", "");
      let destPath;
      if (baseName === "index") {
        destPath = join(destDir, "index.html");
      } else {
        destPath = join(destDir, baseName, "index.html");
      }
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    }
  }
}

copyHtmlPages(serverAppDir, OUT_DIR);
console.log("  ✓ Copied pre-rendered HTML pages");

// 2d. Rewrite asset paths in HTML files to use absolute paths
// (Next.js server-rendered HTML uses /_next/ paths which work fine on IPFS)

// 2e. Create shell HTML for dynamic routes (profile, video)
// These pages load client-side — copy index.html as the shell
const indexHtml = join(OUT_DIR, "index.html");
if (existsSync(indexHtml)) {
  // Create profile/[address]/index.html shell
  // and video/[cid]/index.html shell
  // We use a redirect meta tag to route dynamic segments
  const shellHtml = readFileSync(indexHtml, "utf-8");

  // profile/index.html — client-side routing handles /profile?address=...
  // For IPFS, we'll use the catch-all 404.html approach
  mkdirSync(join(OUT_DIR, "profile"), { recursive: true });
  writeFileSync(join(OUT_DIR, "profile", "index.html"), shellHtml);

  mkdirSync(join(OUT_DIR, "video"), { recursive: true });
  writeFileSync(join(OUT_DIR, "video", "index.html"), shellHtml);

  // 404.html = index.html (SPA fallback for most IPFS gateways)
  writeFileSync(join(OUT_DIR, "404.html"), shellHtml);

  console.log("  ✓ Created SPA shells for dynamic routes (profile, video, 404)");
}

// ─── Step 3: Collect all files ─────────────────────────────────────────────────
function collectFiles(dir, baseDir = dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir));
    } else {
      results.push({ fullPath, relativePath: relative(baseDir, fullPath) });
    }
  }
  return results;
}

const files = collectFiles(OUT_DIR);
console.log(`\n📦  Found ${files.length} files to upload\n`);

// ─── Step 4: Upload folder to Pinata ──────────────────────────────────────────
console.log("📤  Uploading to Pinata IPFS...\n");

const form = new FormData();

for (const { fullPath, relativePath } of files) {
  // Pinata requires a common top-level directory prefix for multi-file uploads
  form.append("file", createReadStream(fullPath), {
    filepath: `app/${relativePath}`,
  });
}

form.append(
  "pinataMetadata",
  JSON.stringify({
    name: `ethvideos.eth — ${new Date().toISOString().slice(0, 10)}`,
    keyvalues: { app: "ethvideos-eth", type: "frontend-deploy" },
  })
);

form.append(
  "pinataOptions",
  JSON.stringify({
    cidVersion: 1,
    wrapWithDirectory: true,
  })
);

let cid;
try {
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata error ${res.status}: ${err}`);
  }

  const data = await res.json();
  cid = data.IpfsHash;
} catch (err) {
  console.error("❌  Upload failed:", err.message);
  process.exit(1);
}

// Resolve inner "app/" CID via Pinata gateway headers
let innerCid = cid;
try {
  // Fetch /app/index.html — the X-Ipfs-Roots header lists CIDs along the path:
  // outerCid, appDirCid, indexHtmlCid  (we want index 1)
  const r = await fetch(
    `https://gateway.pinata.cloud/ipfs/${cid}/app/index.html`,
    { method: "HEAD", headers: { Authorization: `Bearer ${PINATA_JWT}` } }
  );
  const roots = (r.headers.get("x-ipfs-roots") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (roots.length >= 2) {
    innerCid = roots[1]; // index 0 = outer, index 1 = app/ dir
  }
} catch (e) {
  console.warn("⚠️  Could not resolve inner CID:", e.message);
}

// ─── Step 5: Print result ──────────────────────────────────────────────────────
console.log("\n✅  Deployed to IPFS!\n");
console.log("━".repeat(60));
console.log(`  Outer CID: ${cid}`);
console.log(`  App CID:   ${innerCid}`);
console.log(`  IPFS URL:  https://ipfs.io/ipfs/${innerCid}`);
console.log("━".repeat(60));
console.log("\n📋  Next step — set this contenthash on app.ethvideos.eth:\n");
console.log(`  ENS Manager: https://app.ens.domains/app.ethvideos.eth`);
console.log(`  Content hash value: ipfs://${innerCid}`);
console.log("\n  Easiest: paste the CID into app.ens.domains → app.ethvideos.eth → Records → Content\n");
