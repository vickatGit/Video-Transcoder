import mongoose from "mongoose";

const connectDb = async () => {
  try {
    // Mongoose 6.x and later no longer require options like useNewUrlParser or useUnifiedTopology
    await mongoose.connect(process.env.MONGOOSE_DB_URL as string);
    console.log("🔗 MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed", err);
    process.exit(1); // Exit process with failure
  }
};

export default connectDb;
