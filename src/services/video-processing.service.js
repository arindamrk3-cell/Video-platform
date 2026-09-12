const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const Video = require("../modules/videos/video.model");

const {
    downloadObject,
    uploadDirectory,uploadObject
} = require("./storage.service");



const processVideo = async ({
    videoId,
    storageKey
}) => {
    let processingDir;

    try {
        console.log(
            `[VideoProcessor] Starting video: ${videoId}`
        );
        

        processingDir = await fs.mkdtemp(
            path.join(
                os.tmpdir(),
                `video-processing-${videoId}-`
            )
        );

        const inputPath = path.join(
            processingDir,
            "source.mp4"
        );

        const outputDir = path.join(
            processingDir,
            "hls"
        );
        const thumbnailDir = path.join(
    processingDir,
    "thumbnails"
);

const thumbnailPath = path.join(
    thumbnailDir,
    "thumbnail.jpg"
);

        /*
         * 1. Download original from B2
         */
        console.log(
            `[VideoProcessor] Downloading original from B2...`
        );

        await downloadObject({
            storageKey,
            destinationPath: inputPath
        });

        console.log(
            `[VideoProcessor] Original downloaded`
        );

        /*
         * 2. Generate HLS using FFmpeg
         */
        await fs.mkdir(outputDir, {
            recursive: true
        });

        console.log(
    `[VideoProcessor] Extracting video duration...`
);

const duration = await getVideoDuration({
    inputPath
});

console.log(
    `[VideoProcessor] Duration: ${duration} seconds`
);
        console.log(
    `[VideoProcessor] Generating thumbnail...`
);

await fs.mkdir(thumbnailDir, {
    recursive: true
});

await generateThumbnail({
    inputPath,
    outputPath: thumbnailPath,
    duration
});

console.log(
    `[VideoProcessor] Thumbnail generated`
);

console.log(
    `[VideoProcessor] Starting FFmpeg...`
);

await runFFmpeg({
    inputPath,
    outputDir
});

        console.log(
            `[VideoProcessor] FFmpeg processing completed`
        );

        /*
         * 3. Upload HLS output to B2
         */
        const hlsStoragePrefix =
            `videos/${videoId}/hls`;

        console.log(
            `[VideoProcessor] Uploading HLS to B2...`
        );

        const uploadedFiles = await uploadDirectory({
            localDirectory: outputDir,
            storagePrefix: hlsStoragePrefix
        });
        const thumbnailStorageKey =
    `videos/${videoId}/thumbnails/thumbnail.jpg`;

console.log(
    `[VideoProcessor] Uploading thumbnail to B2...`
);

await uploadObject({
    storageKey: thumbnailStorageKey,
    filePath: thumbnailPath,
    contentType: "image/jpeg"
});

console.log(
    `[VideoProcessor] Thumbnail upload completed`
);

        console.log(
            `[VideoProcessor] HLS upload completed`
        );

        const masterPlaylistKey =
    `videos/${videoId}/hls/master.m3u8`;
    await Video.findByIdAndUpdate(
    videoId,
    {
        status: "published",
        "processing.status": "completed",
        "processing.progress": 100,
        "processing.error": null,
        "stream.manifestUrl": masterPlaylistKey,
        thumbnailUrl: thumbnailStorageKey,
        duration,
        publishedAt: new Date()
    },
    {
        returnDocument: "after"
    }
);

console.log(
    `[VideoProcessor] Video marked as published`
);

        return {
            success: true,
            videoId,
            processingDir,
            inputPath,
            outputDir,
            masterPlaylistKey,
            uploadedFiles
        };

    } catch (error) {

        console.error(
            `[VideoProcessor] Failed: ${videoId}`
        );

        console.error(error);

        throw error;
    }
};

const getVideoDuration = ({
    inputPath
}) => {
    return new Promise((resolve, reject) => {
        const args = [
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            inputPath
        ];

        const ffprobe = spawn("ffprobe", args);

        let output = "";
        let errorOutput = "";

        ffprobe.stdout.on("data", (data) => {
            output += data.toString();
        });

        ffprobe.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        ffprobe.on("error", (error) => {
            reject(
                new Error(
                    `Failed to start ffprobe: ${error.message}`
                )
            );
        });

        ffprobe.on("close", (code) => {
            if (code !== 0) {
                reject(
                    new Error(
                        `ffprobe failed: ${errorOutput}`
                    )
                );
                return;
            }

            const duration = Number(
                output.trim()
            );

            if (!Number.isFinite(duration)) {
                reject(
                    new Error(
                        "Could not determine video duration"
                    )
                );
                return;
            }

            resolve(duration);
        });
    });
};


const generateThumbnail = ({
    inputPath,
    outputPath,
    duration
}) => {

    return new Promise((resolve, reject) => {

        const timestamp = Math.min(
            1,
            Math.max(0, duration / 2)
        );

        const args = [
            "-ss",
            String(timestamp),

            "-i",
            inputPath,

            "-frames:v",
            "1",

            "-q:v",
            "2",

            "-vf",
            "scale=1280:-2",

            outputPath
        ];

        const ffmpeg = spawn(
            "ffmpeg",
            args
        );

        let errorOutput = "";

        ffmpeg.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        ffmpeg.on("error", (error) => {
            reject(
                new Error(
                    `Failed to start thumbnail FFmpeg: ${error.message}`
                )
            );
        });

        ffmpeg.on("close", (code) => {

            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        `Thumbnail FFmpeg failed: ${errorOutput}`
                    )
                );
            }
        });
    });
};


const runFFmpeg = ({
    inputPath,
    outputDir
}) => {

    return new Promise((resolve, reject) => {

        const args = [
            "-i",
            inputPath,

            "-filter_complex",
            "[0:v]split=4[v1][v2][v3][v4];" +
            "[v1]scale=w=1920:h=-2[v1080];" +
            "[v2]scale=w=1280:h=-2[v720];" +
            "[v3]scale=w=854:h=-2[v480];" +
            "[v4]scale=w=640:h=-2[v360]",

            "-map",
            "[v1080]",
            "-map",
            "0:a",

            "-map",
            "[v720]",
            "-map",
            "0:a",

            "-map",
            "[v480]",
            "-map",
            "0:a",

            "-map",
            "[v360]",
            "-map",
            "0:a",

            "-c:v",
            "libx264",

            "-c:a",
            "aac",

            "-preset",
            "veryfast",

            "-crf",
            "23",

            "-f",
            "hls",

            "-hls_time",
            "4",

            "-hls_playlist_type",
            "vod",

            "-hls_segment_filename",
            `${outputDir}/%v/segment_%03d.ts`,

            "-master_pl_name",
            "master.m3u8",

            "-var_stream_map",
            "v:0,a:0,name:1080p " +
            "v:1,a:1,name:720p " +
            "v:2,a:2,name:480p " +
            "v:3,a:3,name:360p",

            `${outputDir}/%v/playlist.m3u8`
        ];

        const ffmpeg = spawn(
            "ffmpeg",
            args
        );

        ffmpeg.stdout.on("data", (data) => {
            process.stdout.write(
                `[FFmpeg] ${data}`
            );
        });

        ffmpeg.stderr.on("data", (data) => {
            process.stdout.write(
                data.toString()
            );
        });

        ffmpeg.on("error", (error) => {

            reject(
                new Error(
                    `Failed to start FFmpeg: ${error.message}`
                )
            );
        });

        ffmpeg.on("close", (code) => {

            if (code === 0) {

                resolve();

            } else {

                reject(
                    new Error(
                        `FFmpeg exited with code ${code}`
                    )
                );
            }
        });
    });
};


module.exports = {
    processVideo
};