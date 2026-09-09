const express = require("express");
const alfrescoController = require("./alfresco.controller");

const router = express.Router();

router.get("/folders", alfrescoController.listFolders);
router.get("/documents", alfrescoController.listDocuments);
router.get("/documents/search", alfrescoController.searchDocuments);
router.get("/documents/location", alfrescoController.getDocumentLocation);
router.get("/documents/:id/location", alfrescoController.getDocumentLocation);
router.get("/documents/:id/content", alfrescoController.streamDocumentContent);

module.exports = router;
