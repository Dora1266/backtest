import akshare as ak
from db.stock_operations import replace_df_mysql

# 获取所有的指数信息
index_stock_info_df = ak.index_stock_info()

# 循环遍历每个指数的代码
for symbol in index_stock_info_df['index_code']:
    # 获取该指数对应的成分股数据
    df = ak.index_stock_cons(symbol)

    # 将数据添加到 MySQL 数据库中
    replace_df_mysql(df, 'index', symbol)

    # 打印出每个指数的成分股数据
    print(f"Index Code: {symbol}")
    print(df)
