import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const requestedPort = Number.parseInt(process.env.PORT || "4173", 10);
const maxPortAttempts = 20;

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".ico", "image/x-icon"],
]);

function resolveRequestPath(urlPath) {
  const requestedPath = decodeURIComponent(urlPath || "/");
  let normalized = requestedPath === "/" ? "/index.html" : requestedPath;
  if (normalized.endsWith("/")) {
    normalized += "index.html";
  }
  const targetPath = path.normalize(path.join(rootDir, normalized));

  if (!targetPath.startsWith(rootDir)) {
    return null;
  }

  return targetPath;
}

function createServer() {
  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || "/", "http://localhost");
    const targetPath = resolveRequestPath(requestUrl.pathname);

    if (!targetPath) {
      response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    try {
      const content = await readFile(targetPath);
      const extension = path.extname(targetPath).toLowerCase();
      response.writeHead(200, {
        "content-type": mimeTypes.get(extension) || "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(content);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

async function listenOnAvailablePort(startPort) {
  for (let offset = 0; offset < maxPortAttempts; offset += 1) {
    const port = startPort + offset;
    const server = createServer();

    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, () => {
          server.off("error", reject);
          resolve();
        });
      });

      return { server, port };
    } catch (error) {
      if (error.code !== "EADDRINUSE" || offset === maxPortAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error(`No available port found from ${startPort} to ${startPort + maxPortAttempts - 1}.`);
}

const { port } = await listenOnAvailablePort(requestedPort);
console.log(`Serving ${rootDir} at http://localhost:${port}`);
