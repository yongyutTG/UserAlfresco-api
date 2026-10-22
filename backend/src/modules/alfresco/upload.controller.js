const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const multer = require("multer");
const { uploadFiles } = require("./upload.service");
const { handleError } = require("../../middlewares/errorHandler");
const { audit } = require("../../utils/auditLogger");

function multipartUpload(single = false) {
  return async function upload(req, res, next) {
    if (!req.is("multipart/form-data")) {
      if (single) return next(); // Preserve the existing binary upload endpoint.
      return res.status(415).json({ message: "Use multipart/form-data" });
    }
    let directory;
    try {
      directory = await fs.mkdtemp(path.join(os.tmpdir(), "alfresco-upload-"));
      const parser = multer({
        dest: directory,
        fileFilter(req, file, callback) {
          // Browser multipart filenames commonly arrive as UTF-8 bytes decoded as Latin-1.
          if ([...file.originalname].every((char) => char.charCodeAt(0) <= 255)) {
            const decoded = Buffer.from(file.originalname, "latin1").toString("utf8");
            if (!decoded.includes("\uFFFD")) file.originalname = decoded;
          }
          callback(null, true);
        },
        limits: { fileSize: 25 * 1024 * 1024, files: single ? 1 : 20, fields: 1, fieldSize: 8192, parts: single ? 2 : 21 },
      }).array(single ? "file" : "files", single ? 1 : 20);
      await new Promise((resolve, reject) => parser(req, res, (error) => {
        if (error) { error.statusCode = 400; reject(error); }
        else resolve();
      }));
      const result = await uploadFiles(req.body?.folderPath, req.files, req.alfrescoAuthHeaders, () => req.aborted || res.destroyed);
      for (const item of result.results) audit(req, "UPLOAD_FILE", {
        documentId: item.document?.id, fileName: item.fileName, folderPath: result.folderPath,
        status: item.ok ? "SUCCESS" : "FAILED", message: item.ok ? "Upload file success" : item.error,
      });
      if (!single) audit(req, "BULK_UPLOAD_FILES", { folderPath: result.folderPath,
        status: result.failed ? (result.success ? "PARTIAL" : "FAILED") : "SUCCESS",
        message: `${result.success} uploaded, ${result.failed} failed` });
      if (single) {
        const item = result.results[0];
        return res.status(item.status).json({ ...item, username: req.alfrescoUsername });
      }
      res.status(result.failed ? 207 : 201).json({ ...result, username: req.alfrescoUsername });
    } catch (error) {
      if (error instanceof multer.MulterError) error.statusCode = error.code === "LIMIT_FILE_SIZE" || error.code === "LIMIT_FILE_COUNT" ? 413 : 400;
      audit(req, single ? "UPLOAD_FILE" : "BULK_UPLOAD_FILES", { status: "FAILED", message: error.message });
      if (!res.destroyed && !res.headersSent) handleError(res, "Cannot upload files", error);
    } finally {
      if (directory) await fs.rm(directory, { recursive: true, force: true });
    }
  };
}

module.exports = { multipartUpload };
