const Channel = require("./channel.model");

const createChannel = async ({
    owner,
    name,
    handle,
    description
}) => {

    const existingChannel = await Channel.findOne({ owner });

    if (existingChannel) {
        throw new Error("You already have a channel");
    }

    const existingHandle = await Channel.findOne({ handle });

    if (existingHandle) {
        throw new Error("Channel handle is already taken");
    }

    const channel = await Channel.create({
        owner,
        name,
        handle,
        description
    });

    return channel;
};

const getMyChannel=async(owner)=>{
    const channel=await Channel.findOne({owner});
    if(!channel){
        throw new Error("Channel not found");
    }
    return channel;
};
const getChannelById = async (channelId) => {

    const channel = await Channel.findById(channelId)
        .populate("owner", "username profileImage");

    if (!channel) {
        throw new Error("Channel not found");
    }

    return channel;
};

const updateChannel = async (
    channelId,
    owner,
    updates
) => {

    const channel = await Channel.findOne({
        _id: channelId,
        owner
    });

    if (!channel) {
        throw new Error("Channel not found or unauthorized");
    }

    const allowedFields = [
        "name",
        "handle",
        "description",
        "profileImage",
        "bannerImage"
    ];

    allowedFields.forEach((field) => {

        if (updates[field] !== undefined) {
            channel[field] = updates[field];
        }

    });

    await channel.save();

    return channel;
};

module.exports = {
    createChannel,
    getMyChannel,
    getChannelById,
    updateChannel
};