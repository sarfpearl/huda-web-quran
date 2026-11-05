/**
 * Lightweight local preview server for HuDa Web Quran review boards.
 * Supports HTTP 206 Partial Content for smooth HTML5 video streaming.
 */
import http from "http";
import fs from "fs";
import path from "path";

const PORT = parseInt(process.env.PORT || "3333", 10);
const ROOT = path.resolve(".");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req, res) => {
  // Decode URL and normalize path
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let filePath = path.join(ROOT, decodeURIComponent(parsedUrl.pathname));

  // Security: Prevent traversal outside root
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // If root requested, redirect to master review dashboard
  if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
    res.writeHead(302, { Location: "/scratch/matching/full_review_dashboard.html" });
    res.end();
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(`404 Not Found: ${parsedUrl.pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const total = stats.size;

    // Handle Range requests (critical for video playback & seeking)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

      if (start >= total || end >= total) {
        res.writeHead(416, { "Content-Range": `bytes */${total}` });
        res.end();
        return;
      }

      const chunkSize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": total,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes"
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Review server running at http://localhost:${PORT}/`);
  console.log(`Direct link: http://localhost:${PORT}/scratch/matching/batch_1_review.html`);
});
