import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

interface INotification {
  color: string;
  icon: any;
  id?: string;
  message?: string;
  title: string;
  type?: string;
  children?: React.ReactNode;
  duration?: number;
}

const initialState: { notifications: INotification[] } = {
  notifications: [],
};

const notifyTypes = [
  {
    type: "success",
    icon: CheckCircleIcon,
    color: "green",
  },
  {
    type: "danger",
    icon: ExclamationCircleIcon,
    color: "red",
  },
  {
    type: "warn",
    icon: InformationCircleIcon,
    color: "orange",
  },
];

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    onNotify: (
      state,
      action: PayloadAction<{
        title: string;
        type: string;
        message?: string;
        children?: React.ReactNode;
        duration?: number;
      }>
    ) => {
      const id = Date.now().toString(36);
      const notify =
        action.payload.type === "success"
          ? notifyTypes[0]
          : action.payload.type === "danger"
          ? notifyTypes[1]
          : notifyTypes[2];

      const notification: INotification = {
        id,
        color: notify.color,
        icon: notify.icon,
        message: action.payload.message,
        title: action.payload.title,
        type: action.payload.type,
      };

      if (action.payload.children) {
        notification["children"] = action.payload.children;
      }

      if (action.payload.duration) {
        notification["duration"] = action.payload.duration;
      }

      state.notifications.push(notification);
    },
    removeNotification: (
      state,
      action: PayloadAction<{ id: string | undefined }>
    ) => {
      if (!action.payload.id) return;

      state.notifications = state.notifications.filter((notification) => {
        return action.payload.id !== notification.id;
      });
    },
  },
});

export const { onNotify, removeNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
