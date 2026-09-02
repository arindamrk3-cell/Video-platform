const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 50
        },

        handle: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        description: {
            type: String,
            maxlength: 1000,
            default: ""
        },

        profileImage: {
            type: String,
            default: null
        },

        bannerImage: {
            type: String,
            default: null
        },

        subscribersCount: {
            type: Number,
            default: 0
        },

        videosCount: {
            type: Number,
            default: 0
        },

        isVerified: {
            type: Boolean,
            default: false
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const Channel = mongoose.model("Channel", channelSchema);

module.exports = Channel;