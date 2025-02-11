import { config } from "dotenv";
config();

export const conf = (): {
  appUrl: string;
} => {
  const appUrl =
    process.env.ENV === "DEV"
      ? "http://localhost:5173"
      : "https://vidtrans.pages.dev/";
  return {
    appUrl: appUrl,
  };
};
