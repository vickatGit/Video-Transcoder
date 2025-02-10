import axios from "axios";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import ErrorBoundary from "./components/ErrorBoundry";
import FileUploader from "./components/FileUploaderDialog";
import NotificationList from "./components/NotificationList";
import Table from "./components/Table";
import { onNotify, removeNotification } from "./store/reducers/notification";
import { AppDispatch, RootState } from "./store/store";
let socketId: any = undefined;
const socket = io(import.meta.env.VITE_SOCKET_URL, {
  path: "/api/socket.io",
  transports: ["websocket"],
  secure: true,
  autoConnect: true,
  reconnection: true,
});

export interface ResolutionData {
  status: string;
  url: string;
  progress: number;
}

function App() {
  const [showUploader, setShowUploader] = useState<boolean>(false);
  const [attachment, setAttachment] = useState<File>();
  const notification = useSelector((state: RootState) => state.notification);
  const dispatch = useDispatch<AppDispatch>();
  const [isAllVideoTranscoded, setAllVideoTranscoded] =
    useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [videoResolutions, setVideoResolutions] = useState<
    Map<string, ResolutionData>
  >(
    new Map([
      ["1080p", { status: "Pending", url: "", progress: 0 }],
      ["720p", { status: "Pending", url: "", progress: 0 }],
      ["480p", { status: "Pending", url: "", progress: 0 }],
      ["360p", { status: "Pending", url: "", progress: 0 }],
      ["240p", { status: "Pending", url: "", progress: 0 }],
      ["144p", { status: "Pending", url: "", progress: 0 }],
    ])
  );

  useEffect(() => {
    if (notification.notifications && notification.notifications.length > 0) {
      notification.notifications.forEach((notification) => {
        const id = notification.id;
        const duration = notification.duration || 5000;

        const timer = setTimeout(() => {
          dispatch(removeNotification({ id }));
        }, duration);

        return () => clearTimeout(timer);
      });
    }
  }, [notification.notifications, dispatch]);

  const handleVideoResUpdate = (updateData: any) => {
    if (updateData.operationType === "update") {
      setVideoResolutions((prevResolutions) => {
        const newResolutions = new Map(prevResolutions); // Clone previous state

        // Extract updated resolutions dynamically
        const updatedFields = updateData.updateDescription.updatedFields; // Data from MongoDB stream

        Object.entries(updatedFields).forEach(([key, value]) => {
          if (key.startsWith("resolutions.")) {
            const resolutionKey = key.split(".")[1]; // Extract resolution (e.g., "240p", "144p")
            newResolutions.set(resolutionKey, value as ResolutionData); // Update resolution dynamically
          }
        });

        return newResolutions;
      });
    }
  };

  useEffect(() => {
    console.log("video res updated ", videoResolutions);
    let allResTranscoded = true;
    if (videoResolutions) {
      Array.from(videoResolutions.values()).map((resolution) => {
        if (resolution.url) {
          allResTranscoded = resolution.url?.length > 0;
        } else {
          allResTranscoded = false;
        }
      });
    }
    setAllVideoTranscoded(allResTranscoded);
  }, [videoResolutions]);

  useEffect(() => {
    if (isAllVideoTranscoded) {
      dispatch(
        onNotify({
          title: "Video Transcoded Successfully",
          type: "success",
          message: "Video Trancoded to all Resolutions Successfully",
        })
      );
    }
  }, [isAllVideoTranscoded]);

  useEffect(() => {
    socket.on("connect", async () => {
      socketId = socket.id;
      socket.on("TRANSCRIBER_UPDATE", (data) => {
        console.log("transcriber event ", handleVideoResUpdate(data));
      });
    });

    // const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    //   event.preventDefault();
    //   event.returnValue = ""; // Required for Chrome
    //   return;
    // };

    // window.addEventListener("beforeunload", handleBeforeUnload);

    // return () => {
    //   window.removeEventListener("beforeunload", handleBeforeUnload);
    // };
  }, []);

  useEffect(() => {
    if (attachment) {
      // setInterval(() => {
      //   setProgress((prev) => prev + 1);
      // }, 1000);
      handleUpload();
    }
  }, [attachment]);

  const handleUpload = async () => {
    if (!attachment) return;

    // Prepare the file data to be sent in a FormData object
    const formData = new FormData();
    formData.append("file", attachment);

    try {
      if (!socketId) return;
      formData.append("socketId", socketId.toString());
      socket.on("upload_progress", (data) => {
        setProgress(data.progress);
        console.log("upload progress state : ", JSON.stringify(data, null, 4));
      });

      const res = await axios.post(
        "http://localhost:8000/api/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("video upload res : ", res);

      socket.emit("JOIN_TRANSCODER", res.data.videRes?._id.toString());

      console.log(res.data);
      setAttachment(undefined);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ErrorBoundary type="chat">
      <>
        <NotificationList />
        <div className="p-14 w-screen h-screen overflow-hidden bg-black">
          <div className="relative w-full h-full custom-bg rounded-xl overflow-hidden animate-border">
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-90 z-10 pointer-events-none"></div>

            {/* Glassmorphism Container */}
            <div className=" relative z-20 w-full h-full bg-black bg-opacity-50 backdrop-blur-3xl flex items-center justify-between rounded-xl">
              <div className="w-full h-full flex-1 p-10 flex flex-col items-start justify-center">
                <h2 className="text-white font-bold text-4xl">
                  Transform Your Videos Effortlessly
                </h2>
                <h3 className="text-[1rem]  text-gray-400 mt-2 break break-words ">
                  Quick, Reliable, and High-Quality Video Transcoding at Your
                  Fingertips Including 4K, 2K, 1080p, 720p, 360p, 240p, and 144p
                  Resolutions
                </h3>
                <div
                  className=" mt-20 custom-bg animate-border border overflow-hidden cursor-pointer"
                  onClick={() => {
                    setShowUploader(true);
                  }}
                >
                  <p className=" bg-[#0B0616] px-5 py-2 rounded-xl">
                    Get Started
                  </p>
                </div>
              </div>
              <div className="flex-1 p-28 overflow-hidden flex justify-center items-center pr-11 ">
                <img
                  src="https://www.infracloud.io/assets/img/service-mesh/service-mesh-commercial-support-n-training.svg"
                  className="w-[90%] h-[90%] object-contain "
                />
              </div>
            </div>
          </div>

          <FileUploader
            showModal={showUploader}
            websiteId=""
            setShowUploader={setShowUploader}
            setFileUploaded={() => {}}
            disabled={false}
            setAttachment={setAttachment}
          />
        </div>
        <div className="w-full h-fit bg-black pb-10">
          {/* {attachmentUploaded && <Table videoResolutions={videoResolutions} />} */}
          <Table videoResolutions={videoResolutions} />
          {attachment && (
            <div className="px-8 py-4 rel ">
              <div className="relative w-[30rem] custom-bg rounded-xl overflow-hidden animate-border">
                {/* Video Element */}
                <video controls className="rounded-lg w-full">
                  <source
                    src={URL.createObjectURL(attachment)}
                    type="video/mp4"
                  />
                  Your browser does not support the video tag.
                </video>

                {/* Progress Percentage in the Center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/50 text-white px-3 py-1 rounded-full text-lg font-semibold">
                    {progress}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    </ErrorBoundary>
  );
}

export default App;
