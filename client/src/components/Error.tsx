import {
  SignalSlashIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import Icon from "./Icon";

interface Props {
  error: any;
  errorInfo: any;
}

export default function Error(props: Props) {
  const [offline, setOffline] = useState<boolean>(false);

  useEffect(() => {
    if (!window.navigator.onLine) {
      setOffline(true);
    }
  }, [window.navigator.onLine]);

  const mailto = () => {
    const mailLink = "mailto:support@finexo.in";
    const subject = `Error in ${window.location.href}`;
    const body = `\n\n\nPlease describe the error in detail and also attach the screenshot of the page on which you encountered error.\nError Details:\n\n${props.error}\nComponent Stack:${props.errorInfo}`;

    return `${mailLink}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  if (offline) return <OfflinePage />;

  return (
    <div className="min-h-[70vh] grow py-16 px-6 sm:py-24 grid place-items-center lg:px-8">
      <div className="mx-auto max-w-max">
        <div className="mx-auto w-fit">
          <WrenchScrewdriverIcon
            className="mx-auto h-16 w-16 text-indigo-600 sm:mx-0 sm:h-20 sm:w-20"
            aria-hidden="true"
          />
        </div>
        <div className="sm:flex text-center">
          <div className="">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              We have encountered some errors.
            </h1>
            <p className="mt-3 text-base text-gray-500">
              Please try again after refreshing your page. If you still see this
              page, please report it to{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={mailto()}
                className="text-indigo-600 hover:text-indigo-500"
              >
                support@finexo.in
              </a>
            </p>
            <div className="flex items-center gap-6 mt-6 justify-center">
              <button
                className="w-fit flex items-center gap-2 text-sm px-4 py-2 border border-transparent font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                onClick={() => window.location.reload()}
              >
                <span>
                  <Icon name="refresh" className="w-4 h-4" />
                </span>
                Refresh
                <span></span>
              </button>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={mailto()}
                className="w-fit flex items-center gap-2 text-sm px-4 py-2 border border-transparent font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <span>
                  <Icon name="outline/document-text" className="w-4 h-4" />
                </span>
                Report
                <span></span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const OfflinePage = () => {
  return (
    <div className="min-h-[70vh] grow py-16 px-6 sm:py-24 grid place-items-center lg:px-8">
      <div className="mx-auto max-w-max">
        <div className="mx-auto w-fit">
          <SignalSlashIcon
            className="mx-auto h-16 w-16 text-indigo-600 sm:mx-0 sm:h-20 sm:w-20"
            aria-hidden="true"
          />
        </div>
        <div className="sm:flex text-center">
          <div className="">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Looks like you are offline.
            </h1>
            <p className="mt-3 text-base text-gray-500">
              Please connect to the internet and try again.
            </p>
            <div className="flex items-center gap-6 mt-6 justify-center">
              <button
                className="w-fit flex items-center gap-2 text-sm px-4 py-2 border border-transparent font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                onClick={() => window.location.reload()}
              >
                <span>
                  <Icon name="refresh" className="w-4 h-4" />
                </span>
                Refresh
                <span></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
