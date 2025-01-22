import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// 定义异步操作 fetchIndexConstituent
export const fetchIndexConstituent = createAsyncThunk(
    'stocks/fetchIndexConstituent',
    async (indexCode, { rejectWithValue }) => {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/get_index_constituent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(indexCode)
            });

            if (!response.ok) {
                throw new Error('网络响应不正常');
            }

            // 直接解析 JSON 响应
            let data = await response.json();
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            // 将数据处理为通用的格式
            const formattedData = data.map(item => {
                const formattedItem = {};
                // 使用 Object.keys(item) 动态处理属性
                Object.keys(item).forEach(key => {
                    // 根据需要重命名特定的字段
                    if (key === "code") {
                        formattedItem.code = item[key];
                    } else if (key === "name") {
                        formattedItem.name = item[key];
                    } else {
                        // 其他字段直接添加
                        formattedItem[key] = item[key];
                    }
                });
                return formattedItem;
            });

            return formattedData;

        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// 创建 Redux 切片
const indexConstituentSlice = createSlice({
    name: 'indexConstituent',
    initialState: {
        constituents: [],
        isLoading: false,
        error: null,
    },
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(fetchIndexConstituent.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchIndexConstituent.fulfilled, (state, action) => {
                state.isLoading = false;
                state.constituents = action.payload;
            })
            .addCase(fetchIndexConstituent.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || '数据获取失败';
            });
    },
});

// 导出选择器
export const selectIndexConstituents = (state) => state.indexConstituent.constituents;
export const selectLoading = (state) => state.indexConstituent.isLoading;
export const selectError = (state) => state.indexConstituent.error;

// 导出 reducer 用于 store
export default indexConstituentSlice.reducer;