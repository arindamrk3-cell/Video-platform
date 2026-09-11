const Video = require("./video.model");
const Channel = require("../channels/channel.model");

const createVideo = async ({
    owner,
    title,
    description,
    type,
    category,
    tags
}) => {

    const channel = await Channel.findOne({
        owner,
        isActive: true
    });

    if (!channel) {
        throw new Error("You don't have an active channel");
    }

    const video = await Video.create({
        channel: channel._id,
        title,
        description,
        type,
        category,
        tags
    });

    await Channel.findByIdAndUpdate(
        channel._id,
        {
            $inc: {
                videosCount: 1
            }
        }
    );

    return video;
};

const getVideoById = async (videoId) => {

    const video = await Video.findOne({
        _id: videoId,
        visibility: "public",
        status: "published"
    }).populate(
        "channel",
        "name handle profileImage subscribersCount"
    );

    if (!video) {
        throw new Error("Video not found");
    }

    return video;
};
const getMyVideos = async (owner) => {

    const channel = await Channel.findOne({ owner });

    if (!channel) {
        throw new Error("Channel not found");
    }

    const videos = await Video.find({
        channel: channel._id
    }).sort({
        createdAt: -1
    });

    return videos;
};

const getPublishedVideos = async () => {

    const videos = await Video.find({
        visibility: "public",
        status: "published"
    })
        .populate(
            "channel",
            "name handle profileImage subscribersCount"
        )
        .sort({
            publishedAt: -1
        });

    return videos;
};

module.exports = {
    createVideo,
    getVideoById,
    getMyVideos,
    getPublishedVideos
};