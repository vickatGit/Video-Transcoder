import { configureStore } from "@reduxjs/toolkit";

import notification from "./reducers/notification";

const store = configureStore({
  reducer: {
    notification: notification,
    // public: publicReducer,
    // admin: adminReducer,
    // ecom: ecomReducer,
  },
});
export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
