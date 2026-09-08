const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const { initUpload,completeUpload } = require("./upload.controller");

const router = express.Router();

router.post(
    "/init",
    authMiddleware,
    initUpload
);

router.post(
    "/:uploadId/complete",
    authMiddleware,
    completeUpload
);

module.exports = router;