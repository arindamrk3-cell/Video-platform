const channelService = require("./channel.service");

const createChannel = async (req, res) => {
    try {
        const {
            name,
            handle,
            description
        } = req.body;

        if (!name || !handle) {
            return res.status(400).json({
                success: false,
                message: "Channel name and handle are required"
            });
        }
        const channel = await channelService.createChannel({
            owner: req.user.userId,
            name,
            handle,
            description
        });

        return res.status(201).json({
            success: true,
            message: "Channel created successfully",
            data: channel
        });

    } catch (error) {

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getMyChannel=async(req,res)=>{
    try{
        const channel=await channelService.getMyChannel(req.user.userId);
        return res.status(200).json({
            success:true,
            data:channel
        });
    }
    catch(error){
        return res.status(404).json({
            success:false,
            message:error.message
        });
    }
};

const getChannelById = async (req, res) => {

    try {

        const channel = await channelService.getChannelById(
            req.params.channelId
        );

        return res.status(200).json({
            success: true,
            data: channel
        });

    } catch (error) {

        return res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

const updateChannel = async (req, res) => {

    try {

        const channel = await channelService.updateChannel(
            req.params.channelId,
            req.user.userId,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Channel updated successfully",
            data: channel
        });

    } catch (error) {

        return res.status(403).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createChannel,
    getMyChannel,
    getChannelById,
    updateChannel
};