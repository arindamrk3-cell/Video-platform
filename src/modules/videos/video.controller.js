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
const {
    createPlaybackUrl
} = require("../../services/playback.service");

const Video = require("./video.model");

const getVideoPlayback = async (req, res) => {
    try {
        const { videoId } = req.params;

        const video = await Video.findOne({
            _id: videoId,
            visibility: "public",
            status: "published"
        });

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found or unavailable"
            });
        }

        if (!video.stream?.manifestUrl) {
            return res.status(404).json({
                success: false,
                message: "Video stream is not available"
            });
        }

        const playbackUrl = await createPlaybackUrl({
            storageKey: video.stream.manifestUrl,
            expiresIn: 300
        });

        return res.status(200).json({
            success: true,
            data: {
                videoId: video._id,
                title: video.title,
                duration: video.duration,
                type: video.type,
                playbackUrl
            }
        });

    } catch (error) {
        console.error(
            "[VideoPlayback] Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to create playback URL"
        });
    }
};

const {
    getObjectStream
} = require("../../services/storage.service");

const getHlsMasterPlaylist = async (req, res) => {
    try {
        const { videoId } = req.params;

        const video = await Video.findOne({
            _id: videoId,
            visibility: "public",
            status: "published"
        });

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found or unavailable"
            });
        }

        if (!video.stream?.manifestUrl) {
            return res.status(404).json({
                success: false,
                message: "Video stream is not available"
            });
        }

        const result = await getObjectStream({
            storageKey: video.stream.manifestUrl
        });

        let playlist = "";

        for await (const chunk of result.body) {
            playlist += chunk.toString();
        }

        const basePath =
            `/api/v1/videos/${videoId}/hls`;

        playlist = playlist.replace(
            /^(\d+p\/playlist\.m3u8)$/gm,
            `${basePath}/$1`
        );

        res.status(200);
        res.set("Content-Type", "application/vnd.apple.mpegurl");
        res.set("Cache-Control", "private, max-age=30");

        return res.send(playlist);

    } catch (error) {
        console.error(
            "[HLS Master] Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load HLS master playlist"
        });
    }
};

const getHlsVariantPlaylist = async (req, res) => {
    try {
        const { videoId, quality } = req.params;

        const allowedQualities = [
            "1080p",
            "720p",
            "480p",
            "360p"
        ];

        if (!allowedQualities.includes(quality)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video quality"
            });
        }

        const video = await Video.findOne({
            _id: videoId,
            visibility: "public",
            status: "published"
        });

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found or unavailable"
            });
        }

        if (!video.stream?.manifestUrl) {
            return res.status(404).json({
                success: false,
                message: "Video stream is not available"
            });
        }

        const storageKey =
            `videos/${videoId}/hls/${quality}/playlist.m3u8`;

        const result = await getObjectStream({
            storageKey
        });

        let playlist = "";

        for await (const chunk of result.body) {
            playlist += chunk.toString();
        }

        const segmentBasePath =
            `/api/v1/videos/${videoId}/hls/${quality}`;

        playlist = playlist.replace(
            /^segment_(\d+\.ts)$/gm,
            `${segmentBasePath}/segment_$1`
        );

        res.status(200);
        res.set(
            "Content-Type",
            "application/vnd.apple.mpegurl"
        );
        res.set(
            "Cache-Control",
            "private, max-age=30"
        );

        return res.send(playlist);

    } catch (error) {
        console.error(
            "[HLS Variant] Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load HLS variant playlist"
        });
    }
};

const getHlsSegment = async (req, res) => {
    try {
        const { videoId, quality, segment } = req.params;

        const allowedQualities = [
            "1080p",
            "720p",
            "480p",
            "360p"
        ];

        if (!allowedQualities.includes(quality)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video quality"
            });
        }

        if (!/^segment_\d+\.ts$/.test(segment)) {
            return res.status(400).json({
                success: false,
                message: "Invalid segment"
            });
        }

        const video = await Video.findOne({
            _id: videoId,
            visibility: "public",
            status: "published"
        });

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found or unavailable"
            });
        }

        const storageKey =
            `videos/${videoId}/hls/${quality}/${segment}`;

        const result = await getObjectStream({
            storageKey
        });

        res.status(200);

        res.set(
            "Content-Type",
            "video/mp2t"
        );

        res.set(
            "Cache-Control",
            "private, max-age=3600"
        );

        if (result.contentLength) {
            res.set(
                "Content-Length",
                result.contentLength.toString()
            );
        }

        result.body.pipe(res);

    } catch (error) {
        console.error(
            "[HLS Segment] Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load video segment"
        });
    }
};

module.exports = {
    createVideo,
    getVideoById,
    getMyVideos,
    getVideoPlayback,
    getHlsMasterPlaylist,
    getHlsVariantPlaylist,
    getHlsSegment
};