import numpy as np
import pandas as pd
def calculate_volatility(df, frequency='D'):
        """
        计算给定数据框中的波动率，并返回包含日期和收益率的 DataFrame。
    
        参数：
        df : pandas.DataFrame
            应该包含 'Date' 和 'Close' 列，其中 'Date' 列为日期，'Close' 列为收盘价。
        frequency : str
            波动率计算的频率，可以是 'D'（每日）、'W'（每周）、'M'（每月）等。
    
        返回：
        tuple
            - 波动率 (float)
            - pandas.DataFrame
                包含日期和收益率的 DataFrame
        """
        # 确保 'Date' 列是日期类型
        df['日期'] = pd.to_datetime(df['日期'])
        df.set_index('日期', inplace=True)
    
        # 计算收益率
        df['波动率'] = df['收盘_不复权'].pct_change()
    
        # 按照指定频率重采样并计算收益率
        if frequency == 'W':
            resampled_returns = df['波动率'].resample('W').agg(lambda x: (x + 1).prod() - 1)
        elif frequency == 'M':
            resampled_returns = df['波动率'].resample('M').agg(lambda x: (x + 1).prod() - 1)
        elif frequency == 'D':
            resampled_returns = df['波动率']  # 不需要重采样
        else:
            raise ValueError("frequency 参数必须是 'D'、 'W' 或 'M'。")
    
        # 计算收益率的标准差作为波动率
        volatility = resampled_returns.std()
    
        # 创建返回的结果 DataFrame
        result_df = resampled_returns.reset_index()
        result_df.columns = ['日期', '波动率']
    
        return result_df