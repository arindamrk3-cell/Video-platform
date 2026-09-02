const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
    {
        channel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Channel",
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        description: {
            type: String,
            maxlength: 5000,
            default: ""
        },

        type: {
            type: String,
            enum: ["video", "short", "movie", "music"],
            required: true,
            index: true
        },

        category: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        tags: {
            type: [String],
            default: []
        },

        thumbnailUrl: {
            type: String,
            default: null
        },

        duration: {
            type: Number,
            default: 0
        },

        visibility: {
            type: String,
            enum: ["public", "private", "unlisted"],
            default: "public",
            index: true
        },

        status: {
            type: String,
            enum: [
                "draft",
                "uploading",
                "processing",
                "published",
                "failed",
                "blocked"
            ],
            default: "draft",
            index: true
        },

        processing: {
            status: {
                type: String,
                enum: [
                    "pending",
                    "processing",
                    "completed",
                    "failed"
                ],
                default: "pending"
            },

            progress: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },

            error: {
                type: String,
                default: null
            }
        },

        source: {
            storageKey: {
                type: String,
                default: null
            },

            fileSize: {
                type: Number,
                default: 0
            },

            mimeType: {
                type: String,
                default: null
            }
        },

        stream: {
            manifestUrl: {
                type: String,
                default: null
            }
        },

        stats: {
            views: {
                type: Number,
                default: 0
            },

            likes: {
                type: Number,
                default: 0
            },

            comments: {
                type: Number,
                default: 0
            }
        },

        isAgeRestricted: {
            type: Boolean,
            default: false
        },

        isMonetized: {
            type: Boolean,
            default: false
        },

        publishedAt: {
            type: Date,
            default: null,
            index: true
        }
    },
    {
        timestamps: true
    }
);

videoSchema.index({
    channel: 1,
    createdAt: -1
});

videoSchema.index({
    type: 1,
    visibility: 1,
    status: 1,
    createdAt: -1
});

videoSchema.index({
    category: 1,
    visibility: 1,
    status: 1,
    createdAt: -1
});

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;