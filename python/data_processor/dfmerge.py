import pandas as pd
def merge_df_rows(*dfs):
    return pd.concat(dfs, ignore_index=True)  # 忽略索引

def merge_df_columns(*dfs):
    return pd.concat(dfs, axis=1)  # 按列合并

