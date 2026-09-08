const express = require("express");

const videoController = require("./video.controller");
const authenticate = require("../../middleware/auth.middleware");

const router = express.Router();

router.post("/",    authenticate,    videoController.createVideo);
router.get("/my",authenticate, videoController.getMyVideos);
router.get("/:videoId/playback", videoController.getVideoPlayback);
router.get("/:videoId/hls/master.m3u8", videoController.getHlsMasterPlaylist);
router.get("/:videoId/hls/:quality/playlist.m3u8", videoController.getHlsVariantPlaylist);
router.get("/:videoId/hls/:quality/:segment", videoController.getHlsSegment);
router.get("/:videoId",    videoController.getVideoById);
module.exports = router;