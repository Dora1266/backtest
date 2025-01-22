import pandas as pd

def filldates(df):
    """
    填充缺失日期的数据，将缺失日期的开盘价、收盘价、最高价和最低价都设为上一日的收盘价。
    缺失的成交量填充为0。

    参数:
    df (DataFrame): 包含日期及其对应数据的 DataFrame，必须包含一个 '日期' 列

    返回:
    DataFrame: 填充缺失的日期后的 DataFrame
    """
    # 确保 '日期' 列是 datetime 格式
    df['日期'] = pd.to_datetime(df['日期'])

    # 设置日期为索引
    df.set_index('日期', inplace=True)

    # 重新生成日期范围，包括缺失的日期
    full_range = pd.date_range(start=df.index.min(), end=df.index.max(), freq='D')

    # 重新索引 DataFrame，填充缺失的日期
    df_full = df.reindex(full_range)

    # 用前一个有效值填充缺失的收盘价和成交量
    # 使用向前填充来填补缺失的收盘价
    df_full['收盘_不复权'] = df_full['收盘_不复权'].ffill()

    # 缺失的成交量填充为0
    df_full['成交量_不复权'] = df_full['成交量_不复权'].fillna(0)

    # 用最新的收盘价填充缺失的开盘价、最高价和最低价
    df_full['开盘_不复权'] = df_full['开盘_不复权'].fillna(df_full['收盘_不复权'])
    df_full['最高_不复权'] = df_full['最高_不复权'].fillna(df_full['收盘_不复权'])
    df_full['最低_不复权'] = df_full['最低_不复权'].fillna(df_full['收盘_不复权'])

    # 确保收盘价和成交量被恰当地填充
    df_full['收盘_不复权'] = df_full['收盘_不复权'].ffill()
    df_full['成交量_不复权'] = df_full['成交量_不复权'].fillna(1)  # 确保成交量可以为缺失

    # 重置索引并返回结果
    df_full.reset_index(inplace=True)
    df_full.rename(columns={'index': '日期'}, inplace=True)

    return df_full
