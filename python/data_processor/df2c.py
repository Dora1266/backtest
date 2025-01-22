import pandas as pd

def df2c(df):
    # 将每一列转为字典，键为列名，值为列数据
    columns = {}
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            # 如果是日期类型，显式转换为 datetime.date() 的形式
            columns[col] = [date.date() for date in df[col]]
        else:
            # 对于非日期类型，使用 values 转换为列表
            columns[col] = df[col].values.tolist()  # 使用 .values 获取 NumPy 数组再转为列表
    return columns