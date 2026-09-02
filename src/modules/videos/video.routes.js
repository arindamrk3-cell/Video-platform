const express = require("express");

const videoController = require("./video.controller");
const authenticate = require("../../middleware/auth.middleware");

const router = express.Router();

router.post(    "/",    authenticate,    videoController.createVideo);
router.get("/my",authenticate, videoController.getMyVideos);
router.get(    "/:videoId",    videoController.getVideoById);
module.exports = router;