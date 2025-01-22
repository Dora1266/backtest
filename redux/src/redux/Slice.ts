// slice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// 异步获取股票数据
export const fetchStockData = createAsyncThunk(
    'stock/fetchStockData',
    async ({ stockCode, startDate, endDate }, { rejectWithValue }) => {
        try {
            const response = await fetch('http://127.0.0.1:5000/random-stock-data', { // 修改为实际的API端点
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock_code: stockCode, start_date: startDate, end_date: endDate })
            });
            if (!response.ok) {
                throw new Error('网络响应不正常');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const stockSlice = createSlice({
    name: 'stock',
    initialState: {
        stockCode: '000001',
        startDate: '2024-01-01',
        endDate: '2024-12-30',
        data: null,
        isLoading: false,
        error: null,
    },
    reducers: {
        setStockCode: (state, action) => {
            state.stockCode = action.payload;
        },
        setStartDate: (state, action) => {
            state.startDate = action.payload;
        },
        setEndDate: (state, action) => {
            state.endDate = action.payload;
        },
    },
    extraReducers: builder => {
        builder
            .addCase(fetchStockData.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchStockData.fulfilled, (state, action) => {
                state.isLoading = false;
                state.data = action.payload;
            })
            .addCase(fetchStockData.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || '数据获取失败';
            });
    },
});

export const { setStockCode, setStartDate, setEndDate } = stockSlice.actions;
export default stockSlice.reducer;
