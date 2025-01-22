import numpy as np
import pandas as pd
def calculate_volume_ratio(df):
        if '成交量_不复权' not in df.columns:
            raise ValueError("DataFrame中缺少'成交量_不复权'列")
        
        # 计算5日均成交量
        df['5日均成交量'] = df['成交量_不复权'].rolling(window=5).mean()
        
        # 计算量比
        df['量比'] = df['成交量_不复权'] / df['5日均成交量']
        
        # 构建包含日期和量比的新DataFrame
        result = df[['日期', '量比']].dropna()  # 删除因计算均值导致的NaN值
        
        return result