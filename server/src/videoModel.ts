import mongoose from "mongoose";

// Define schema for individual resolution details
const ResolutionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "done", "failed"], // Restrict to valid values
      default: "pending",
    },
    url: {
      type: String,
      default: "",
      trim: true, // Remove extra spaces
    },
    progress: {
      type: Number,
      min: 0, // Ensure valid progress values
      max: 100,
      default: 0,
    },
  },
  { _id: false } // Prevents Mongoose from adding an `_id` field to each resolution
);

// Define main video schema
const VideoSchema = new mongoose.Schema(
  {
    videoName: {
      type: String,
      required: false,
      trim: true, // Remove leading/trailing spaces
    },
    ext: {
      type: String,
      required: false,
      lowercase: true, // Store file extensions in lowercase (e.g., "mp4" instead of "MP4")
      trim: true,
    },
    resolutions: {
      type: Map,
      of: ResolutionSchema, // Use the predefined schema for resolution details
      default: () => new Map(), // Ensure resolutions is always initialized
    },
  },
  { timestamps: true } // Auto-generate createdAt & updatedAt fields
);

// Create and export the model
export const VideoModel = mongoose.model("Video", VideoSchema);
