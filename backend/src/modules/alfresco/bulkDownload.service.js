const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const archiver = require("archiver");
const repo = require("./alfresco.repo");

const MAX_FILES = 100;
const MAX_BYTES = 500 * 1024 * 1024;
function fail(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

// Stage all content before responding so a denied file never produces a partial ZIP.
async function prepareDownload(payload, headers, signal) {
  const documents = payload?.documents;
  if (!Array.isArray(documents) || !documents.length || documents.length > MAX_FILES ||
      documents.some((d) => !d || typeof d.id !== "string" || !d.id.trim() ||
        (d.name !== undefined && typeof d.name !== "string"))) {
    throw fail("documents must contain 1-100 objects with a non-empty string id", 400);
  }
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), "alfresco-download-"));
  const cleanup = () => fsp.rm(directory, { recursive: true, force: true });
  try {
    const metadata = [];
    for (const document of documents) {
      signal?.throwIfAborted();
      const object = await repo.getObjectById(document.id, headers);
      if (!object.isDocument || object.permissions?.canDownload !== true) {
        throw fail("Download permission denied for a requested document", 403);
      }
      metadata.push(object);
    }
    let bytes = 0;
    const names = new Set();
    const entries = [];
    for (let i = 0; i < documents.length; i++) {
      signal?.throwIfAborted();
      let source;
      try {
        source = (await repo.getDocumentContentStream(documents[i].id, headers)).data;
      } catch (error) {
        error.response?.data?.destroy?.();
        throw error;
      }
      const filename = path.join(directory, String(i));
      const limiter = new Transform({
        transform(chunk, encoding, callback) {
          bytes += chunk.length;
          callback(bytes > MAX_BYTES ? fail("Download exceeds 500 MiB", 413) : null, chunk);
        },
      });
      await pipeline(source, limiter, fs.createWriteStream(filename, { mode: 0o600 }), { signal });
      let name = (documents[i].name || metadata[i].name || "document")
        .replace(/[\\/\x00-\x1f\x7f:<>"|?*]/g, "_").replace(/[. ]+$/g, "").slice(0, 180) || "document";
      const extension = path.extname(name);
      const base = name.slice(0, name.length - extension.length);
      let suffix = 1;
      while (names.has(name.toLowerCase())) name = `${base} (${suffix++})${extension}`;
      names.add(name.toLowerCase());
      entries.push({ filename, name });
    }
    const zipPath = path.join(directory, "archive.zip");
    const archive = archiver("zip", { zlib: { level: 1 } });
    archive.on("warning", (error) => archive.destroy(error));
    const writing = pipeline(archive, fs.createWriteStream(zipPath, { mode: 0o600 }), { signal });
    for (const entry of entries) archive.file(entry.filename, { name: entry.name });
    await Promise.all([writing, archive.finalize()]);
    const timestamp = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).format(new Date()).replace(/[-:]/g, "").replace(" ", "_");
    return { zipPath, name: `documents_${timestamp}.zip`, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

module.exports = { prepareDownload };
