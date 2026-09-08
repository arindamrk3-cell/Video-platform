const mongoose = require("mongoose");

const uploadSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        video: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
            required: true,
            index: true
        },

        storageKey: {
            type: String,
            required: true,
            unique: true
        },

        originalFileName: {
            type: String,
            required: true
        },

        fileSize: {
            type: Number,
            required: true
        },

        mimeType: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: [
                "pending",
                "uploading",
                "completed",
                "failed",
                "expired"
            ],
            default: "pending",
            index: true
        },

        expiresAt: {
            type: Date,
            required: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

const UploadSession = mongoose.model(
    "UploadSession",
    uploadSessionSchema
);

module.exports = UploadSession;