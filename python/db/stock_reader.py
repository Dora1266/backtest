# db/stock_reader.py
import pandas as pd
from .connection import create_db_connection

class StockDataReader:
    def __init__(self, table_name, db_name):
        self.table_name = table_name
        self.db_name = db_name
        self.engine = create_db_connection(db_name)

    def read_data(self, columns, start_date=None, end_date=None):
        """ 读取特定列的数据，并可以指定日期范围 """
        columns_str = ', '.join([f'`{col}`' for col in columns])
        query = f"SELECT {columns_str} FROM `{self.table_name}`"

        conditions = []
        if start_date:
            conditions.append(f"`日期` >= '{start_date}'")
        if end_date:
            conditions.append(f"`日期` <= '{end_date}'")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        df = pd.read_sql(query, con=self.engine)
        return df

    def read_columns(self, columns, start_date=None, end_date=None):
        """ 获取特定列和特定日期范围的数据 """
        return self.read_data(columns, start_date=start_date, end_date=end_date)
