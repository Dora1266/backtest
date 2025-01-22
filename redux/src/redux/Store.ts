import { configureStore } from '@reduxjs/toolkit';
import stockReducer from './Slice'; // 你的股票 Slice
import indexConstituentSliceReducer from './selectslice'; // 你的成分 Slice

export const store = configureStore({
  reducer: {
    stock: stockReducer,
    indexConstituent: indexConstituentSliceReducer, // 将 indexConstituent 的 Reducer 添加到 store
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;