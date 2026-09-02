const express = require("express");

const channelController = require("./channel.controller");
const authenticate = require("../../middleware/auth.middleware");

const router = express.Router();

router.post(
    "/",
    authenticate,
    channelController.createChannel
);
router.get("/me",authenticate,channelController.getMyChannel);
router.get("/:channelId", channelController.getChannelById);
router.patch("/:channelId", authenticate, channelController.updateChannel);
module.exports = router;