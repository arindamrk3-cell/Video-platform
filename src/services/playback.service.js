const {
    createDownloadUrl
} = require("./storage.service");

const createPlaybackUrl = async ({
    storageKey,
    expiresIn = 300
}) => {
    if (!storageKey) {
        throw new Error("Storage key is required");
    }

    const url = await createDownloadUrl({
        storageKey,
        expiresIn
    });

    return url;
};

module.exports = {
    createPlaybackUrl
};