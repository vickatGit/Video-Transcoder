import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./connectDb";
import videoRoutes from "./routes";
import { VideoModel } from "./videoModel";
import mongoose from "mongoose";
import { conf } from "./config";

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB(); // Connect to MongoDB

// Use routes
app.use("/api", videoRoutes);

const server = app.listen(PORT, () => {
  console.log(`⚡ Server is running on http://localhost:${PORT}`);
  try {
    const pipeline = [
      {
        $match: {
          "documentKey._id": new mongoose.Types.ObjectId(
            "659a6aa1064370b4a993021f"
          ), // Filter for a specific document
        },
      },
    ];
    const changeStream = VideoModel.watch(pipeline);

    changeStream.on("change", (change) => {
      console.log("📌 Change detected:", change);
    });
  } catch (err) {
    console.error("❌ Error watching document:", err);
  }
});

const io = require("socket.io")(server, {
  path: "/api/socket.io",
  cors: {
    origin: (origin: any, callback: any) => {
      if (origin === conf().appUrl) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  },
  maxHttpBufferSize: 1e8,
});

export let ioSocket: any;
io.on("connection", (socket: any) => {
  ioSocket = io;
  console.log("socket got connected : ", socket?.id);
  socket.on("JOIN_TRANSCODER", async (videoId: string) => {
    console.log(`socket id : ${socket.id} joined `);
    try {
      // Create a pipeline that watches for changes on the specified document
      const pipeline = [
        {
          $match: {
            "documentKey._id": new mongoose.Types.ObjectId(videoId),
          },
        },
      ];
      // Create the change stream on the VideoModel collection
      const changeStream = VideoModel.watch(pipeline);

      // When a change is detected, emit the update directly to the current socket
      changeStream.on("change", (change) => {
        console.log("📌 Change detected:", change);
        // This sends the change event back to the socket that emitted JOIN_TRANSCODER
        socket.emit("TRANSCRIBER_UPDATE", change);
      });
    } catch (err) {
      console.error("❌ Error watching document:", err);
    }
  });
});
