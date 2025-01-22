import numpy as np
import pandas as pd
def moving_average(df, column, moving_average_days):
    df[f'{moving_average_days}日均线'] = df[column].rolling(window=moving_average_days).mean()
    result = df[[df.columns[0], f'{moving_average_days}日均线']]  # 假设第一列是日期
    return result