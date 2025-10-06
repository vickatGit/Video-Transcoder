import mongoose from "mongoose";
// import { config } from "dotenv";
// config();

// dbConnect();

import { config } from "dotenv";
import { createClient } from "redis";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
const ffmpeg = require("fluent-ffmpeg");
import { SQSClient, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import * as fs from "fs";
import { VideoModel } from "./videoModel";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
config();

const queueUrl = `${process.env.SQS_QUEUE_URL}`;
const sqsClient = new SQSClient({});
const s3Client = new S3Client({
  // region: `${process.env.AWS_REGION}`,
  // credentials: {
  //   accessKeyId: `${process.env.AWS_ACCESS_KEY_ID}`,
  //   secretAccessKey: `${process.env.AWS_SECRET_ACCESS_KEY}`,
  // },
});
const redisClient = createClient({
  password: `${process.env.REDIS_CLOUD_PASSWORD}`,
  socket: {
    host: `${process.env.REDIS_CLOUD_HOST}`,
    port: parseInt(`${process.env.REDIS_CLOUD_PORT}`),
  },
});

ffmpeg.setFfmpegPath(ffmpegPath);

export const dbConnect = async () => {
  try {
    await mongoose.connect(`${process.env.MONGOOSE_DB_URL}`);
    console.log("connection made to db successfully");
  } catch (error) {
    console.log("Error with Connecting to database", error);
  }
};

type VideoCodec = {
  resolution: string;
  folder: string;
  videoBitrate: string;
};

// Resolutions
const videoCodecs: VideoCodec[] = [
  { resolution: "256x144", folder: "144p", videoBitrate: "80" },
  { resolution: "426x240", folder: "240p", videoBitrate: "700" },
  { resolution: "640x360", folder: "360p", videoBitrate: "1000" },
  { resolution: "854x480", folder: "480p", videoBitrate: "2500" },
  { resolution: "1280x720", folder: "720p", videoBitrate: "5000" },
  { resolution: "1920x1080", folder: "1080p", videoBitrate: "8000" },
];

export async function startEcsTask() {
  try {
    if (!process.env.S3_FILE_KEY) {
      return;
    }
    let videoPath: string = extractPath(`${process.env.S3_FILE_KEY}`);
    // let videoPath: string = extractPath(`temp/videoplayback.mp4`);
    console.log("removed temp : ", videoPath);
    let promises: Promise<string>[] = [];
    console.log(
      "redic cloud REDIS_CLOUD_PASSWORD : ",
      process.env.REDIS_CLOUD_PASSWORD
    );
    console.log(
      "redic cloud REDIS_CLOUD_HOST : ",
      process.env.REDIS_CLOUD_HOST
    );
    console.log(
      "redic cloud REDIS_CLOUD_PORT : ",
      process.env.REDIS_CLOUD_PORT
    );

    const sqsMessageReceipientHandle: string = extractPath(
      `${process.env.RECEIPT_HANDLE}`
    );

    await dbConnect();
    await redisClient.connect();
    await redisClient.incr("server_count");
    await redisClient.quit();

    const { fileName, extension } = separateFileNameAndExtension(videoPath);
    console.log("file name: ", fileName, " ext: ", extension);
    const videoObjectParams = {
      Bucket: process.env.S3_BUCKET,
      Key: videoPath,
    };

    let videoStream = await s3Client.send(
      new GetObjectCommand(videoObjectParams)
    );
    const localVideoFolder = `./temp/local`;
    const localVideoFilePath = `./temp/local/${fileName}.${extension}`;

    try {
      await createFile(localVideoFolder);
      console.log("file");
      const videoWriteStream = fs.createWriteStream(localVideoFilePath);

      (videoStream.Body as any).pipe(videoWriteStream);
      videoWriteStream
        .on("finish", async () => {
          console.log("file downloaded");
          videoCodecs.forEach((videoCodec: VideoCodec) => {
            const folderPath = `./temp/${videoCodec.folder}`;
            if (!fs.existsSync(folderPath)) {
              fs.mkdirSync(folderPath, { recursive: true });
              console.log(`Created folder: ${folderPath}`);
            } else {
              console.log(`Folder already exists: ${folderPath}`);
            }
            const vidTrancodingPromice = transcodeVideo(
              localVideoFilePath,
              videoCodec,
              fileName,
              extension
            );
            promises.push(vidTrancodingPromice);
          });
          await Promise.all(promises);
          await deleteMessageFromSqs(sqsMessageReceipientHandle, queueUrl);
          endTask();
        })
        .on("error", (err: any) => {
          console.error("Downloading Error:", err);
          endTask();
        });
    } catch (error) {
      console.log("mkdir error ", error);
    }
  } catch (error) {
    console.log("catch error ", error);
    endTask();
  }
}

async function endTask() {
  try {
    await redisClient.connect();
    await redisClient.decr("server_count");
    await redisClient.quit();
    await mongoose.connection.close();
  } catch (error) {
    console.log("redis", error);
  }
  process.exit(0);
}

function extractPath(inputString: string): string {
  const tempIndex = inputString.indexOf("temp/");
  return tempIndex !== -1 ? inputString.substring(tempIndex) : "";
}

function separateFileNameAndExtension(filePath: string): {
  fileName: string;
  extension: string;
} {
  const lastSlashIndex = filePath.lastIndexOf("/");
  const fileNameWithExtension =
    lastSlashIndex !== -1 ? filePath.substring(lastSlashIndex + 1) : filePath;
  const lastDotIndex = fileNameWithExtension.lastIndexOf(".");
  const fileName =
    lastDotIndex !== -1
      ? fileNameWithExtension.substring(0, lastDotIndex)
      : fileNameWithExtension;
  const extension =
    lastDotIndex !== -1
      ? fileNameWithExtension.substring(lastDotIndex + 1)
      : "";
  return { fileName, extension };
}

async function deleteVideoFile(
  videoCodec: VideoCodec,
  fileName: string,
  extension: string
) {
  try {
    fs.unlinkSync(`./temp/${videoCodec.folder}/${fileName}.${extension}`);
    console.log(
      `File ${videoCodec.folder}/${fileName}.${extension} has been deleted successfully.`
    );
  } catch (err) {
    console.error(
      `Error deleting file ${videoCodec.folder}/${fileName}.${extension}: ${err}`
    );
  }
}

async function uploadVideoToS3(
  videoCodec: VideoCodec,
  fileName: string,
  extension: string
) {
  console.log("uploading video to s3 ", videoCodec, fileName, extension);
  const objectKey = `${videoCodec.folder}/${fileName}.${extension}`;
  const s3Params = {
    Bucket: process.env.S3_BUCKET,
    Key: objectKey,
    Body: fs.createReadStream(
      `./temp/${videoCodec.folder}/${fileName}.${extension}`
    ),
  };
  try {
    await s3Client.send(new PutObjectCommand(s3Params));
    const getObjectParams = {
      Bucket: process.env.S3_BUCKET,
      Key: objectKey,
    };
    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 3600,
    });
    console.log(`Video uploaded to S3 Presigned URL: ${presignedUrl}`);
    return presignedUrl;
  } catch (uploadError) {
    console.error("Error uploading to S3:", uploadError);
    return "";
  }
}

function deleteMessageFromSqs(receiptHandle: string, queueUrl: string) {
  if (receiptHandle) {
    const deleteSqsMessageParams = {
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    };
    try {
      sqsClient.send(new DeleteMessageCommand(deleteSqsMessageParams));
    } catch (error) {
      console.log("Error deleting message from SQS ", error);
    }
  }
}

function createFile(folderPath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`Created folder: ${folderPath}`);
        resolve("Folder Created");
      } else {
        console.log(`Folder already exists: ${folderPath}`);
        resolve("Folder Already Exists");
      }
    } catch (error) {
      console.log("mkdir error ", error);
      reject("Failed to create ");
    }
  });
}

async function transcodeVideo(
  localVideoFilePath: string,
  videoCodec: VideoCodec,
  fileName: string,
  extension: string
): Promise<string> {
  console.log("video transcoding started");
  await dbConnect();
  return new Promise<string>((resolve) => {
    ffmpeg(localVideoFilePath)
      .format(`${extension}`)
      .videoCodec("libx264")
      .audioCodec("aac")
      .videoBitrate(`${videoCodec.videoBitrate}`)
      .size(`${videoCodec.resolution}`)
      .on("progress", async (prog: any) => {
        console.log("progress ", prog);
        await saveResolutionToDB(
          fileName,
          videoCodec,
          "",
          "Processing",
          prog.percent
        );
      })
      .on("start", async () => {
        console.log("Transcoding Started");
        await saveResolutionToDB(fileName, videoCodec, "", "Processing");
      })
      .on("end", async () => {
        console.log("Transcoding Ended");
        const s3Url = await uploadVideoToS3(videoCodec, fileName, extension);
        await saveResolutionToDB(fileName, videoCodec, s3Url || "", "Done");
        await deleteVideoFile(videoCodec, fileName, extension);
        resolve("");
      })
      .on("error", async (err: any) => {
        console.error("Transcoding Error:", err);
        resolve("");
      })
      .output(`./temp/${videoCodec.folder}/${fileName}.${extension}`)
      .run();
  });
}

async function saveResolutionToDB(
  fileName: string,
  videoCodec: VideoCodec,
  url: string,
  status: "Pending" | "Processing" | "Done" | "Failed",
  progress: number = 0
) {
  console.log("file name in save resolution to DB : ", fileName, videoCodec);
  try {
    const videoRes = await VideoModel.findOne({ videoName: fileName });
    if (!videoRes) {
      console.log("could not find video");
      return;
    }
    // Update the resolution map
    videoRes.resolutions.set(videoCodec.folder, {
      url: url || "",
      status: status || "Pending",
      progress: status === "Done" ? 100 : progress,
    });

    // Save the updated document
    const data = await videoRes.save();

    console.log("vid resolution update: ", JSON.stringify(data, null, 4));
  } catch (error) {
    console.log("Error saving resolution to DB:", error);
  }
}

startEcsTask();
