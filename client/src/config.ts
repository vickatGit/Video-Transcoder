export const conf = (): {
  socketUrl: string;
} => {
  const socketUrl =
    (import.meta.env.VITE_ENV as any).toString() === "DEV"
      ? "http://localhost:8000"
      : "https://video-transcoder-production.up.railway.app";
  return {
    socketUrl: socketUrl,
  };
};
