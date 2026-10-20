#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ingestQwalela, HOMESTEAD_DIR } from "./scripts/ingest-qwalela.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = 43123;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
};

function safeFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const rel = decoded === "/" ? "/index.html" : decoded;
  const resolved = path.normalize(path.join(ROOT, rel));
  if (!resolved.startsWith(ROOT + path.sep) && resolved !== ROOT) return null;
  return resolved;
}

function send(res, code, body, type = "text/plain; charset=utf-8") {
  const data = Buffer.from(body);
  res.writeHead(code, {
    "Content-Type": type,
    "Content-Length": data.length,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  res.end(data);
}

async function handleHomesteadUpload(req, res) {
  let Busboy;
  try {
    ({ default: Busboy } = await import("busboy"));
  } catch {
    send(res, 500, "Upload is not available (missing busboy).");
    return;
  }

  fs.mkdirSync(HOMESTEAD_DIR, { recursive: true });
  const saved = [];
  const bb = Busboy({ headers: req.headers, limits: { fileSize: 80 * 1024 * 1024 } });

  bb.on("file", (_name, file, info) => {
    const filename = path.basename(info.filename || "photo.bin").replace(/[^\w.\- ()]/g, "_");
    const dest = path.join(HOMESTEAD_DIR, filename);
    saved.push(filename);
    file.pipe(fs.createWriteStream(dest));
  });

  bb.on("error", (err) => send(res, 400, String(err.message || err)));
  bb.on("finish", () => {
    const images = ingestQwalela();
    send(
      res,
      200,
      `Saved ${saved.length} file(s): ${saved.join(", ") || "(none)"}\nWeb photos ready: ${images.length}`
    );
  });

  req.pipe(bb);
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  if (req.method === "POST" && urlPath === "/qwalela-upload") {
    handleHomesteadUpload(req, res);
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    });
    res.end();
    return;
  }

  const file = safeFile(req.url || "/");
  if (!file) {
    res.writeHead(403, { Connection: "close" });
    res.end();
    return;
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        Connection: "close",
      });
      res.end("Not found");
      return;
    }

    const headers = {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    };
    if (req.method === "HEAD") {
      res.writeHead(200, headers);
      res.end();
      return;
    }
    res.writeHead(200, headers);
    const stream = fs.createReadStream(file);
    stream.on("error", () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  });
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 0;
server.timeout = 0;
server.on("clientError", (_err, socket) => {
  if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});
server.listen(PORT, "0.0.0.0", () => {
  ingestQwalela();
  setInterval(ingestQwalela, 4000);
  console.log(`Serving on http://0.0.0.0:${PORT}/`);
});
