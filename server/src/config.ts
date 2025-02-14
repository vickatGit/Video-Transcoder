import { config } from "dotenv";
config();

export const conf = (): {
  appUrl: string;
} => {
  const appUrl =
    (process.env.ENV as any)?.toString() === "DEV"
      ? "http://localhost:5173"
      : "https://vidtrans.pages.dev";
  console.log("got app url :", appUrl);
  return {
    appUrl: appUrl,
  };
};
