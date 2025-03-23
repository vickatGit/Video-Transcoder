import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import Redis from "redis";

// Initialize Redis Client
const redisClient = Redis.createClient({
  password: process.env.REDIS_CLOUD_PASSWORD,
  socket: {
    host: `${process.env.REDIS_CLOUD_HOST}`,
    port: parseInt(`${process.env.REDIS_CLOUD_PORT}`),
  },
});

redisClient.on("error", (err) => console.error("Redis error:", err));

// Initialize S3 Client
const s3 = new S3Client();

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";
const FOLDERS = ["1080", "720", "480", "360", "240", "144"];

export const handler = async () => {
  try {
    console.log("Starting S3 cleanup...");

    for (const folder of FOLDERS) {
      const params = { Bucket: BUCKET_NAME, Prefix: folder + "/" };
      const listCommand = new ListObjectsV2Command(params);
      const { Contents } = await s3.send(listCommand);

      if (Contents) {
        for (const file of Contents) {
          const fileAge = Date.now() - new Date(file.LastModified!).getTime();
          if (fileAge > 60 * 60 * 1000) {
            await s3.send(
              new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: file.Key! })
            );
            console.log(`Deleted: ${file.Key}`);
          }
        }
      }
    }

    // Keep Redis Connection Alive
    redisClient.set("keep-alive", Date.now().toString());

    console.log("S3 Cleanup Completed.");
  } catch (error) {
    console.error("Error:", error);
  }
};
