const fs = require("fs/promises");
const path = require("path");
const { pipeline } = require("stream/promises");
const {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const {
    getSignedUrl
} = require("@aws-sdk/s3-request-presigner");

const requiredEnv = [
    "STORAGE_ENDPOINT",
    "STORAGE_REGION",
    "STORAGE_BUCKET",
    "STORAGE_ACCESS_KEY",
    "STORAGE_SECRET_KEY"
];


for (const variable of requiredEnv) {
    if (!process.env[variable]) {
        throw new Error(
            `Missing storage environment variable: ${variable}`
        );
    }
}


const s3Client = new S3Client({
    region: process.env.STORAGE_REGION,

    endpoint: process.env.STORAGE_ENDPOINT,

    credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY,
        secretAccessKey: process.env.STORAGE_SECRET_KEY
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED"
});


const createUploadUrl = async ({
    storageKey,
    mimeType,
    expiresIn = 900
}) => {

    const command = new PutObjectCommand({
        Bucket: process.env.STORAGE_BUCKET,
        Key: storageKey,
        ContentType: mimeType
    });

    const uploadUrl = await getSignedUrl(
        s3Client,
        command,
        {
            expiresIn
        }
    );

    return uploadUrl;
};

const checkObjectExists = async (storageKey) => {
    const command = new HeadObjectCommand({
        Bucket: process.env.STORAGE_BUCKET,
        Key: storageKey
    });

    const result = await s3Client.send(command);

    return {
        exists: true,
        fileSize: result.ContentLength || 0,
        mimeType: result.ContentType || null,
        etag: result.ETag || null
    };
};

const downloadObject = async ({
    storageKey,
    destinationPath
}) => {
    const command = new GetObjectCommand({
        Bucket: process.env.STORAGE_BUCKET,
        Key: storageKey
    });

    const result = await s3Client.send(command);

    if (!result.Body) {
        throw new Error(
            `Storage returned an empty body for: ${storageKey}`
        );
    }

    const fileHandle = await fs.open(
        destinationPath,
        "w"
    );

    try {
        await pipeline(
            result.Body,
            fileHandle.createWriteStream()
        );
    } finally {
        await fileHandle.close();
    }

    return destinationPath;
};

const uploadObject = async ({
    storageKey,
    filePath,
    contentType
}) => {
    const fileBuffer = await fs.readFile(filePath);

    const command = new PutObjectCommand({
        Bucket: process.env.STORAGE_BUCKET,
        Key: storageKey,
        Body: fileBuffer,
        ContentType: contentType
    });

    const result = await s3Client.send(command);

    return {
        storageKey,
        etag: result.ETag || null
    };
};

const uploadDirectory = async ({
    localDirectory,
    storagePrefix
}) => {
    const uploadedFiles = [];

    const walkDirectory = async (directory) => {
        const entries = await fs.readdir(
            directory,
            {
                withFileTypes: true
            }
        );

        for (const entry of entries) {
            const fullPath = path.join(
                directory,
                entry.name
            );

            if (entry.isDirectory()) {
                await walkDirectory(fullPath);
                continue;
            }

            const relativePath = path
                .relative(
                    localDirectory,
                    fullPath
                )
                .replace(/\\/g, "/");

            const storageKey =
                `${storagePrefix}/${relativePath}`;

            const contentType =
                getContentType(entry.name);

            const result = await uploadObject({
                storageKey,
                filePath: fullPath,
                contentType
            });

            uploadedFiles.push({
                ...result,
                localPath: fullPath,
                contentType
            });

            console.log(
                `[Storage] Uploaded: ${storageKey}`
            );
        }
    };

    await walkDirectory(localDirectory);

    return uploadedFiles;
};


const getContentType = (fileName) => {
    const extension = path
        .extname(fileName)
        .toLowerCase();

    switch (extension) {
        case ".m3u8":
            return "application/vnd.apple.mpegurl";

        case ".ts":
            return "video/mp2t";

        case ".mp4":
            return "video/mp4";

        case ".jpg":
        case ".jpeg":
            return "image/jpeg";

        case ".png":
            return "image/png";

        default:
            return "application/octet-stream";
    }
};
const createDownloadUrl = async ({
    storageKey,
    expiresIn = 3600
}) => {
    const command = new GetObjectCommand({
        Bucket: process.env.STORAGE_BUCKET,
        Key: storageKey
    });

    const downloadUrl = await getSignedUrl(
        s3Client,
        command,
        {
            expiresIn
        }
    );

    return downloadUrl;
};

const getObjectStream = async ({
    storageKey
}) => {
    if (!storageKey) {
        throw new Error("Storage key is required");
    }

    const command = new GetObjectCommand({
        Bucket: process.env.STORAGE_BUCKET,
        Key: storageKey
    });

    const result = await s3Client.send(command);

    return {
        body: result.Body,
        contentType: result.ContentType,
        contentLength: result.ContentLength
    };
};

module.exports = {
    createUploadUrl,
    checkObjectExists,
    downloadObject,
    uploadObject,
    uploadDirectory,
    getContentType,
    createDownloadUrl,
    getObjectStream
};