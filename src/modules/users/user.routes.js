const express = require("express");

const userController = require("./user.controller");
const authenticate = require("../../middleware/auth.middleware");

const router = express.Router();

router.get("/me", authenticate, userController.getMe);

module.exports = router;