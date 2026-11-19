const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes, randomUUID } = require("node:crypto");

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, "");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "links.json");
const PAGE_FILE = path.join(__dirname, "public", "index.html");
const PUBLIC_DIR = path.join(__dirname, "public");

function readLinks() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeLinks(links) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(links, null, 2));
  fs.renameSync(temporaryFile, DATA_FILE);
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(value));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function createLink(body, response) {
  if (!body || typeof body.url !== "string" || body.url.length > 2048) {
    sendJson(response, 400, { error: "Enter a destination URL under 2,048 characters." });
    return;
  }

  let destination;
  try {
    destination = new URL(body.url);
  } catch {
    sendJson(response, 400, { error: "Enter a valid destination URL." });
    return;
  }

  if (destination.protocol !== "http:" && destination.protocol !== "https:") {
    sendJson(response, 400, { error: "Only HTTP and HTTPS links can be shortened." });
    return;
  }

  const requestedSlug = typeof body.alias === "string" ? body.alias.trim() : "";
  if (requestedSlug && !/^[a-zA-Z0-9_-]{3,24}$/.test(requestedSlug)) {
    sendJson(response, 400, { error: "Custom aliases must be 3–24 letters, numbers, hyphens, or underscores." });
    return;
  }

  const links = readLinks();
  let slug = requestedSlug;
  if (slug && links.some((link) => link.slug.toLowerCase() === slug.toLowerCase())) {
    sendJson(response, 409, { error: "That custom alias is already in use." });
    return;
  }
  if (!slug) {
    do {
      slug = randomBytes(4).toString("hex");
    } while (links.some((link) => link.slug === slug));
  }

  const link = {
    id: randomUUID(),
    slug,
    url: destination.toString(),
    createdAt: new Date().toISOString(),
    clicks: 0
  };
  links.unshift(link);
  writeLinks(links);
  sendJson(response, 201, { ...link, shortUrl: `${BASE_URL}/${slug}` });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, BASE_URL);
  const pathname = requestUrl.pathname;

  if (request.method === "GET" && pathname === "/") {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });
    response.end(fs.readFileSync(PAGE_FILE));
    return;
  }

  if (request.method === "GET" && (pathname === "/style.css" || pathname === "/script.js")) {
    const publicFile = path.join(PUBLIC_DIR, path.basename(pathname));
    if (!fs.existsSync(publicFile)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Asset not found.");
      return;
    }

    const contentType = pathname.endsWith(".css")
      ? "text/css; charset=utf-8"
      : "text/javascript; charset=utf-8";
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(fs.readFileSync(publicFile));
    return;
  }

  if (request.method === "GET" && pathname === "/api/links") {
    const links = readLinks().map((link) => ({
      ...link,
      shortUrl: `${BASE_URL}/${link.slug}`
    }));
    sendJson(response, 200, { links });
    return;
  }

  if (request.method === "POST" && pathname === "/api/links") {
    try {
      createLink(await readBody(request), response);
    } catch (error) {
      if (!response.headersSent && !response.destroyed) {
        sendJson(response, 400, { error: error.message });
      }
    }
    return;
  }

  if (request.method === "DELETE" && pathname.startsWith("/api/links/")) {
    const slug = decodeURIComponent(pathname.slice("/api/links/".length));
    const links = readLinks();
    const remaining = links.filter((link) => link.slug !== slug);
    if (remaining.length === links.length) {
      sendJson(response, 404, { error: "Link not found." });
      return;
    }
    writeLinks(remaining);
    sendJson(response, 200, { success: true });
    return;
  }

  const match = request.method === "GET" && pathname.match(/^\/([a-zA-Z0-9_-]+)$/);
  if (match) {
    const links = readLinks();
    const link = links.find((item) => item.slug === match[1]);
    if (!link) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("This short link does not exist.");
      return;
    }
    link.clicks += 1;
    writeLinks(links);
    response.writeHead(302, { Location: link.url, "Cache-Control": "no-store" });
    response.end();
    return;
  }

  sendJson(response, 404, { error: "Not found." });
});

server.listen(PORT, () => {
  console.log(`Swyft is running at ${BASE_URL}`);
});
