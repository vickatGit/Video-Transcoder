export const conf = (): {
  socketUrl: string;
  baseUrl: string;
} => {
  const socketUrl =
    (import.meta.env.VITE_ENV as any).toString() === "DEV"
      ? "http://localhost:8000"
      : "https://video-transcoder-acu2.onrender.com";

  const baseUrl =
    (import.meta.env.VITE_ENV as any).toString() === "DEV"
      ? "http://localhost:8000"
      : "https://video-transcoder-acu2.onrender.com";
  return {
    socketUrl: socketUrl,
    baseUrl: baseUrl,
  };
};
