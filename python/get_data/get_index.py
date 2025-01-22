import akshare as ak
from db.stock_operations import (
    read_table_df_mysql,
    delete_rows_from_table_mysql,
    read_table_range_df_mysql,
    read_matching_rows_from_mysql,
    add_data_mysql,
    add_json_mysql,
    replace_json_mysql,
    read_last_row_mysql,
    read_specific_columns_from_mysql, delete_json_mysql, read_specific_rows_from_mysql, add_df_mysql
)
df = ak.stock_zh_index_spot_sina()
add_df_mysql(df,'core','zh_index')