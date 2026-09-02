const videoService = require("./video.service");

const createVideo = async (req, res) => {

    try {

        const {
            title,
            description,
            type,
            category,
            tags
        } = req.body;

        if (!title || !type || !category) {
            return res.status(400).json({
                success: false,
                message: "Title, type and category are required"
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

        const video = await videoService.createVideo({
            owner: req.user.userId,
            title,
            description,
            type,
            category,
            tags: Array.isArray(tags) ? tags : []
        });

        return res.status(201).json({
            success: true,
            message: "Video created successfully",
            data: video
        });

    } catch (error) {

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getVideoById = async (req, res) => {

    try {

        const video = await videoService.getVideoById(
            req.params.videoId
        );

        return res.status(200).json({
            success: true,
            data: video
        });

    } catch (error) {

        return res.status(404).json({
            success: false,
            message: error.message
        });
    }
};
const getMyVideos = async (req, res) => {

    try {

        const videos = await videoService.getMyVideos(
            req.user.userId
        );

        return res.status(200).json({
            success: true,
            count: videos.length,
            data: videos
        });

    } catch (error) {

        return res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createVideo,
    getVideoById,
    getMyVideos
};