import dotenv from "dotenv";
import Redis from "ioredis";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

dotenv.config();

/** 🔹 Initialize Redis Client */
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
});

/** 🔹 Handle Redis Connection */
redis.on("connect", () => console.log("✅ Connected to Redis!"));
redis.on("error", (err) => console.error("❌ Redis Error:", err));

/** 🔹 AWS S3 Client */
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/** 🔹 Folders to check inside S3 */
const FOLDER_NAMES = ["1080", "720", "480", "360", "240", "144"];
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

/** 🔹 Function to Delete Old Files from S3 */
const deleteOldFilesFromS3 = async () => {
  try {
    const bucketName = process.env.S3_BUCKET_NAME!;
    console.log(`🔍 Checking files in S3 bucket: ${bucketName}`);

    for (const folder of FOLDER_NAMES) {
      console.log(`📂 Checking folder: ${folder}/`);
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `${folder}/`,
      });
      const listedObjects = await s3.send(listCommand);

      if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
        console.log(`✅ No files found in ${folder}/`);
        continue;
      }

      const now = Date.now();
      const oldFiles = listedObjects.Contents.filter((file) => {
        return (
          file.LastModified &&
          now - file.LastModified.getTime() > ONE_HOUR_IN_MS
        );
      });

      if (oldFiles.length === 0) {
        console.log(`✅ No old files in ${folder}/`);
        continue;
      }

      const deleteParams = {
        Bucket: bucketName,
        Delete: { Objects: oldFiles.map(({ Key }) => ({ Key })) },
      };

      const deleteCommand = new DeleteObjectsCommand(deleteParams);
      await s3.send(deleteCommand);
      console.log(`🗑️ Deleted ${oldFiles.length} old files from ${folder}/`);
    }
  } catch (error) {
    console.error("❌ Error deleting files from S3:", error);
  }
};

/** 🔹 Update Redis Keep-Alive Field */
const updateKeepAlive = async () => {
  try {
    await redis.set("keep_alive", new Date().toISOString());
    console.log("🔄 Redis keep_alive updated.");
  } catch (err) {
    console.error("❌ Error updating Redis keep_alive:", err);
  }
};

/** 🔹 Execute the Cleanup Task Immediately */
(async () => {
  console.log("🚀 Cron job started: Running deleteOldFilesFromS3...");
  await deleteOldFilesFromS3();
  await updateKeepAlive();
  console.log("✅ Cleanup Task Completed!");
  process.exit(0); // Exit after execution
})();
