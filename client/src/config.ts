export const conf = (): {
  socketUrl: string;
} => {
  const socketUrl =
    (import.meta.env.VITE_ENV as any).toString() === "DEV"
      ? "http://localhost:8000"
      : "https://vidtrans.pages.dev/";
  return {
    socketUrl: socketUrl,
  };
};
