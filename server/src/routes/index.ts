import { Router, Request, Response, NextFunction } from "express";
const router = Router();
import multer from "multer";
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const storage = multer.memoryStorage();
const upload = multer({ storage });
import { Upload } from "@aws-sdk/lib-storage";
import { ioSocket } from "..";
import { VideoModel } from "../videoModel";

router.post("/upload", upload.single("file"), async (req: any, res: any) => {
  try {
    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
    const socketId = req.body.socketId;
    ioSocket.to(socketId).emit("upload_progress", { progress: 0 });

    const file = req.file;
    if (!file) {
      return res.status(400).send("No file uploaded.");
    }

    const { fileName, extension } = separateFileNameAndExtension(
      `temp/${Date.now()}-${file.originalname}`
    );
    const videRes = await VideoModel.create({
      videoName: fileName,
      ext: extension,
      resolutions: {
        "144p": { status: "pending", url: "", progress: 0 },
        "240p": { status: "pending", url: "", progress: 0 },
        "360p": { status: "pending", url: "", progress: 0 },
        "480p": { status: "pending", url: "", progress: 0 },
        "720p": { status: "pending", url: "", progress: 0 },
        "1080p": { status: "pending", url: "", progress: 0 },
      },
    });

    const params = {
      Bucket: process.env.S3_BUCKET_NAME as string, // Your private bucket name
      Key: `temp/${fileName}.${extension}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const parallelUploads3 = new Upload({
      client: s3,
      params,
      queueSize: 4, // Number of concurrent uploads
      partSize: 5 * 1024 * 1024, // 1 MB per part (adjust as needed)
    });

    // Listen for progress events from S3
    parallelUploads3.on("httpUploadProgress", (progress: any) => {
      // Calculate percentage progress
      const percentCompleted = progress.total
        ? Math.round((progress.loaded * 100) / progress.total)
        : 0;
      console.log(`S3 Upload Progress: ${percentCompleted}%`);

      // Emit progress event to the client using its socketId
      ioSocket
        .to(socketId)
        .emit("upload_progress", { progress: percentCompleted });
    });

    // Start the upload
    const data = await parallelUploads3.done();
    return res.json({ message: "File uploaded successfully", videRes });
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return res.status(500).send(error);
  }
});

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

router.route("/get_videos").get();

export default router;
