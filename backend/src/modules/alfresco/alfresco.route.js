const express = require("express");
const alfrescoController = require("./alfresco.controller");

const router = express.Router();
const rawFileBody = express.raw({
  type: ["application/octet-stream", "application/pdf", "image/*", "text/*", "application/*"],
  limit: "100mb",
});

router.get("/folders", alfrescoController.listFolders);
router.get("/folders/tree", alfrescoController.listFolderTree);
router.post("/documents", rawFileBody, alfrescoController.createDocument);
router.get("/documents", alfrescoController.listDocuments);
router.get("/documents/search", alfrescoController.searchDocuments);
router.get("/documents/location", alfrescoController.getDocumentLocation);
router.get("/documents/versions", alfrescoController.getDocumentVersions);
router.patch("/documents", alfrescoController.updateDocument);
router.delete("/documents", alfrescoController.deleteDocument);
router.put("/documents/content", rawFileBody, alfrescoController.replaceDocumentContent);
router.patch("/documents/:id", alfrescoController.updateDocument);
router.delete("/documents/:id", alfrescoController.deleteDocument);
router.get("/documents/:id/location", alfrescoController.getDocumentLocation);
router.get("/documents/:id/versions", alfrescoController.getDocumentVersions);
router.get("/documents/:id/content", alfrescoController.streamDocumentContent);
router.put("/documents/:id/content", rawFileBody, alfrescoController.replaceDocumentContent);

module.exports = router;
