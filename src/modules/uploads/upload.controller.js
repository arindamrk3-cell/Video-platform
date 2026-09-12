const mongoose = require("mongoose");
const UploadSession = require("./upload-session.model");
const Video = require("../videos/video.model");
const Channel = require("../channels/channel.model");
const { createUploadUrl,checkObjectExists } = require("../../services/storage.service");
const {
    processVideo
} = require("../../services/video-processing.service");

const initUpload = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            title,
            description,
            type,
            category,
            tags,
            fileName,
            fileSize,
            mimeType
        } = req.body;

        // -----------------------------
        // Basic validation
        // -----------------------------

        if (
            !title ||
            !type ||
            !category ||
            !fileName ||
            !fileSize ||
            !mimeType
        ) {
            return res.status(400).json({
                success: false,
                message: "Required upload information is missing"
            });
        }

        const allowedTypes = [
            "video",
            "short",
            "movie",
            "music"
        ];

        if (!allowedTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video type"
            });
        }

        const allowedMimeTypes = [
            "video/mp4",
            "video/webm",
            "video/quicktime"
        ];

        if (!allowedMimeTypes.includes(mimeType)) {
            return res.status(400).json({
                success: false,
                message: "Unsupported video format"
            });
        }

        if (!Number.isFinite(Number(fileSize)) || Number(fileSize) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid file size"
            });
        }

        // -----------------------------
        // Find user's channel
        // -----------------------------

        const channel = await Channel.findOne({
            owner: userId,
            isActive: true
        });

        if (!channel) {
            return res.status(404).json({
                success: false,
                message: "You must create a channel before uploading videos"
            });
        }

        // -----------------------------
        // Create Video
        // -----------------------------

        const video = await Video.create({
            channel: channel._id,
            title,
            description: description || "",
            type,
            category,
            tags: Array.isArray(tags) ? tags : [],
            status: "uploading",
            processing: {
                status: "pending",
                progress: 0
            },
            source: {
                fileSize: Number(fileSize),
                mimeType
            }
        });

        // -----------------------------
        // Generate storage key
        // -----------------------------

        const storageKey =
            `videos/${video._id}/original/source${getExtension(mimeType)}`;

        // -----------------------------
        // Create upload session
        // -----------------------------

        const expiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        );

        const uploadSession = await UploadSession.create({
            user: userId,
            video: video._id,
            storageKey,
            originalFileName: fileName,
            fileSize: Number(fileSize),
            mimeType,
            status: "pending",
            expiresAt
        });
        const uploadUrl= await createUploadUrl({
            storageKey,
            mimeType
        })

        // -----------------------------
        // Update Video source
        // -----------------------------

        video.source.storageKey = storageKey;

        await video.save();

        return res.status(201).json({
            success: true,
            message: "Upload session created successfully",
            data: {
                uploadId: uploadSession._id,
                videoId: video._id,
                storageKey,
                uploadUrl,
                status: uploadSession.status,
                expiresAt: uploadSession.expiresAt
            }
        });

    } catch (error) {
        console.error("Init upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to initialize upload"
        });
    }
};

const completeUpload = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { uploadId } = req.params;

        // -----------------------------
        // Find upload session
        // -----------------------------

        const uploadSession = await UploadSession.findOne({
            _id: uploadId,
            user: userId
        });

        if (!uploadSession) {
            return res.status(404).json({
                success: false,
                message: "Upload session not found"
            });
        }

        // -----------------------------
        // Check expiration
        // -----------------------------

        if (uploadSession.expiresAt < new Date()) {

            uploadSession.status = "expired";

            await uploadSession.save();

            return res.status(400).json({
                success: false,
                message: "Upload session has expired"
            });
        }

        // -----------------------------
        // Prevent duplicate completion
        // -----------------------------

        if (uploadSession.status === "completed") {
            return res.status(400).json({
                success: false,
                message: "Upload is already completed"
            });
        }

        if (
            uploadSession.status === "failed" ||
            uploadSession.status === "expired"
        ) {
            return res.status(400).json({
                success: false,
                message: "Upload session is no longer active"
            });
        }

        // -----------------------------
        // Verify object in B2
        // -----------------------------

        let objectInfo;

        try {
            objectInfo = await checkObjectExists(
                uploadSession.storageKey
            );
        } catch (error) {

            console.error(
                "Storage object verification failed:",
                error.message
            );

            return res.status(400).json({
                success: false,
                message: "Uploaded file was not found in storage"
            });
        }

        // -----------------------------
        // Verify file size
        // -----------------------------

        if (
            objectInfo.fileSize !== uploadSession.fileSize
        ) {
            return res.status(400).json({
                success: false,
                message: "Uploaded file size does not match"
            });
        }

        // -----------------------------
        // Verify MIME type
        // -----------------------------

        if (
            objectInfo.mimeType &&
            objectInfo.mimeType !== uploadSession.mimeType
        ) {
            return res.status(400).json({
                success: false,
                message: "Uploaded file type does not match"
            });
        }

        // -----------------------------
        // Update upload session
        // -----------------------------

        uploadSession.status = "completed";

        await uploadSession.save();

        // -----------------------------
        // Update video
        // -----------------------------

        const video = await Video.findOne({
            _id: uploadSession.video,
            channel: {
                $exists: true
            }
        });

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found"
            });
        }

        video.status = "processing";

        video.processing.status = "pending";
        video.processing.progress = 0;
        video.processing.error = null;

        video.source.fileSize = objectInfo.fileSize;
        video.source.mimeType = objectInfo.mimeType;
        video.source.storageKey = uploadSession.storageKey;

        await video.save();

        processVideo({
    videoId: video._id,
    storageKey: uploadSession.storageKey
}).catch((error) => {
    console.error(
        `[UploadProcessor] Video processing failed: ${video._id}`,
        error
    );
});

        return res.status(200).json({
            success: true,
            message: "Upload completed successfully",
            data: {
                uploadId: uploadSession._id,
                videoId: video._id,
                status: uploadSession.status,
                videoStatus: video.status,
                fileSize: objectInfo.fileSize,
                mimeType: objectInfo.mimeType,
                etag: objectInfo.etag
            }
        });

    } catch (error) {
        console.error("Complete upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to complete upload"
        });
    }
};

// Convert MIME type to extension
const getExtension = (mimeType) => {
    switch (mimeType) {
        case "video/mp4":
            return ".mp4";

        case "video/webm":
            return ".webm";

        case "video/quicktime":
            return ".mov";

        default:
            return "";
    }
};


module.exports = {
    initUpload,
    completeUpload
};