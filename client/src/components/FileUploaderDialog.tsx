import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";

import { bytesToHumanReadableString } from "../helpers";

export interface IAttachment {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: string;
  websiteId: string;
  userId: string;
  createdAt: string;
}

type Props = {
  disabled?: boolean;
  showModal: boolean;
  setShowUploader: any;
  websiteId: string;
  setFileUploaded: (fileUploaded: boolean) => void;
  setAttachment: any;
};

const types = [
  ".mp4",
  ".mkv",
  ".avi",
  ".mov",
  ".flv",
  ".wmv",
  ".webm",
  ".mpeg",
  ".mpg",
  ".3gp",
  ".ogv",
  ".vob",
  ".ts",
  ".m4v",
  ".rm",
  ".asf",
];

const maxSize = 20;

const checkType = (file: File, types: Array<string>): boolean => {
  const extension = file.name.split(".").pop();
  if (extension) {
    return types.includes(extension.toLowerCase());
  }

  return false;
};

const getFileSizeMB = (size: number): number => {
  return size / 1024 / 1024;
};

const FileUploader = (props: Props) => {
  const [attachment, setAttachment] = useState<File | undefined>(undefined);

  const handleChanges = (file: File): boolean => {
    return true;
    if (file) {
      if (types && !checkType(file, types)) {
        // dispatch(
        //   addNotification({
        //     title: "Error",
        //     message: "This file type is not supported!",
        //     type: "danger",
        //   })
        // );
        return false;
      }
      if (maxSize && getFileSizeMB(file.size) > maxSize) {
        // dispatch(
        //   addNotification({
        //     title: "Error",
        //     message: "Size of selected file is bigger than 1 MB!",
        //     type: "danger",
        //   })
        // );
        return false;
      }
      return true;
    }
    return false;
  };

  const handleInputChange = (ev: any) => {
    const file = ev.target.files[0];
    ev.target.value = "";

    const success = handleChanges(file);
    if (success) {
      setAttachment(file);
    }
  };

  const onClose = () => {
    setAttachment(undefined);
    props.setShowUploader();
  };

  return (
    <Transition.Root show={props.showModal} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={() => null}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative custom-bg animate-border border rounded-lg  text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full ">
                <div className="bg-gray-900 px-4 pt-5 pb-4">
                  <div className="hidden sm:block absolute top-0 right-0 pt-4 pr-4 border-none">
                    <div
                      className="text-gray-600   rounded-md bg-gray-900 hover:text-white "
                      onClick={onClose}
                    >
                      <span className="sr-only">Close</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="size-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-black sm:mx-0 sm:h-10 sm:w-10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                        />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <Dialog.Title
                        as="h3"
                        className="text-lg leading-6 font-medium text-gray-200"
                      >
                        Upload Logo
                      </Dialog.Title>
                    </div>
                  </div>

                  <div className="relative mt-4">
                    <input
                      type="file"
                      id="file-upload"
                      name="file-upload"
                      onChange={handleInputChange}
                      className="absolute cursor-pointer opacity-0 flex justify-center w-full py-20 border-2 border-gray-300 hover:border-indigo-200 border-dashed rounded-md"
                      disabled={props.disabled}
                    />
                    <div className="flex justify-center px-6 py-12 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <>
                          {!attachment ? (
                            <>
                              <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1"
                                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <div className="flex text-sm text-gray-600">
                                <label
                                  htmlFor="file-upload"
                                  className="relative cursor-pointer rounded-md font-medium text-indigo-600"
                                >
                                  <span>Upload a file</span>
                                  <input
                                    id="file-upload"
                                    name="file-upload"
                                    onChange={handleInputChange}
                                    type="file"
                                    className="sr-only"
                                  />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center">
                              {attachment ? (
                                <video
                                  className="bg-white w-full rounded-lg object-contain"
                                  width="182"
                                  height="182"
                                  src={URL.createObjectURL(attachment)}
                                  controls
                                  preload="metadata"
                                />
                              ) : (
                                <svg
                                  className="mx-auto h-12 w-12 text-gray-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              )}
                              <div className="flex text-sm text-gray-600">
                                <label
                                  htmlFor="file-upload"
                                  className="relative cursor-pointer rounded-md font-medium text-indigo-600 focus-within:outline-none"
                                >
                                  <p className="text-sm text-gray-600">
                                    {attachment?.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {bytesToHumanReadableString(
                                      attachment?.size
                                    )}
                                  </p>
                                  <br />
                                  <input
                                    id="file-upload"
                                    name="file-upload"
                                    onChange={handleInputChange}
                                    type="file"
                                    className="sr-only"
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                        </>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    {attachment && (
                      <div className=" mt-2 custom-bg animate-border border overflow-hidden cursor-pointer">
                        <p
                          className=" bg-[#0B0616] px-5 py-2 rounded-xl"
                          onClick={() => {
                            console.log("");
                            props.setAttachment(attachment);
                            setAttachment(undefined);
                            props.setShowUploader(false);
                          }}
                        >
                          Upload File
                        </p>
                      </div>
                    )}
                    {/* <Button
                      name={"Upload"}
                      disabled={isUploading || !attachment}
                      onClick={uploadFile}
                      isLoading={isUploading}
                      icon={"outline/upload"}
                    /> */}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default FileUploader;
