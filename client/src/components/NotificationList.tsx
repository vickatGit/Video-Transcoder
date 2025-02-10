import { Transition } from "@headlessui/react";
// import { XMarkIcon } from "@heroicons/react/20/solid";
import { Fragment, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ErrorBoundary from "./ErrorBoundry";
import { RootState } from "../store/store";
import { removeNotification } from "../store/reducers/notification";

const NotificationList = () => {
  const dispatch = useDispatch();
  const notification = useSelector((state: RootState) => state.notification);

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

  return (
    <>
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 z-[100000] flex items-end px-4 py-6 sm:items-start sm:p-6"
      >
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
          {/* Notification panel, dynamically insert this into the live region when it needs to be displayed */}
          {notification.notifications
            .filter((n) => n.title)
            .map((notification) => {
              return (
                <Transition
                  show={true}
                  as={Fragment}
                  enter="transform ease-out duration-300 transition"
                  enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
                  enterTo="translate-y-0 opacity-100 sm:translate-x-0"
                  key={notification.id}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <notification.icon
                            className={
                              notification.color === "red"
                                ? "h-6 w-6 text-red-400"
                                : notification.color === "green"
                                ? "h-6 w-6 text-green-400"
                                : "h-6 w-6 text-yellow-400"
                            }
                            aria-hidden="true"
                          />
                        </div>
                        <ErrorBoundary type="notification">
                          <div className="ml-3 w-0 flex-1 pt-0.5">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {notification.message}
                            </p>
                            <span className="mt-1 text-sm">
                              {notification.children}
                            </span>
                          </div>
                        </ErrorBoundary>
                        {/* <div className="ml-4 flex flex-shrink-0">
                          <button
                            className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                            onClick={() =>
                              dispatch(
                                removeNotification({ id: notification.id })
                              )
                            }
                          >
                            <span className="sr-only">Close</span>
                            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div> */}
                      </div>
                    </div>
                  </div>
                </Transition>
              );
            })}
        </div>
      </div>
    </>
  );
};

export default NotificationList;
