import pandas as pd

def standard_deviation(df, column, moving_average_days):
    df[f'{moving_average_days}日标准差'] = df[column].rolling(window=moving_average_days).std()
    return df[f'{moving_average_days}日标准差']
