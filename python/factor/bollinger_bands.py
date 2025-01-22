import numpy as np
import pandas as pd
import factor.moving_average

def bollinger_bands(df, column, moving_average_days, k):
        df[f'{moving_average_days}日均线']=factor.moving_average.moving_average(df, column, moving_average_days)
    
        df[f'{moving_average_days}日标准差'] = df[column].rolling(window=moving_average_days).std()
    
        df[f'{moving_average_days}日上轨'] = df[f'{moving_average_days}日均线'] + (
    
                            k * df[f'{moving_average_days}日标准差'])
    
        df[f'{moving_average_days}日下轨'] = df[f'{moving_average_days}日均线'] - (
    
        
    
                            k * df[f'{moving_average_days}日标准差'])
    
        result = df[[df.columns[0], f'{moving_average_days}日下轨',f'{moving_average_days}日上轨']]  # 假设第一列是日期
    
        return result