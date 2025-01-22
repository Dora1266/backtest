import uuid
from sqlalchemy import insert
from db.connection import create_db_connection
import pandas as pd
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, Float, DateTime, String, inspect, text
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import Engine
import math

def read_matching_column(db_name, table_name, match_column, match_value):
    """
    从特定数据库的特定表中匹配特定列的记录

    :param db_name: 数据库名称
    :param table_name: 表名
    :param match_column: 要匹配的列名
    :param match_value: 要匹配的值
    :return: 返回匹配的记录
    """
    engine = create_db_connection(db_name)
    metadata = MetaData()
    table = Table(table_name, metadata, autoload_with=engine)
    query = table.select().where(table.c[match_column] == match_value)
    with engine.connect() as connection:
        result = connection.execute(query)
        df = pd.DataFrame(result.fetchall(), columns=result.keys())
    return df['config_value'].iloc[0]

def get_column_data_type(engine, db, table, column):
    """
    获取指定列的数据类型
    """
    query = """
        SELECT DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = :db 
          AND TABLE_NAME = :table 
          AND COLUMN_NAME = :column
    """
    with engine.connect() as conn:
        result = conn.execute(text(query), {"db": db, "table": table, "column": column}).fetchone()
        if result:
            return result[0]
        else:
            raise ValueError(f"无法找到表 {table} 中的列 {column}。")

def generate_temp_val(engine, db, table, column, data_type):
    """
    根据列的数据类型生成一个唯一的临时值
    """
    if data_type in ['int', 'bigint', 'smallint', 'mediumint', 'tinyint']:
        temp_val = -1
        while True:
            query = f"SELECT COUNT(*) as count FROM {table} WHERE {column} = :temp_val"
            with engine.connect() as conn:
                result = conn.execute(text(query), {"temp_val": temp_val}).fetchone()
                if result[0] == 0:
                    break
                temp_val -= 1
        return temp_val
    elif data_type in ['varchar', 'char', 'text', 'mediumtext', 'longtext']:
        return f"TEMP_SWAP_{uuid.uuid4()}"
    else:
        raise TypeError(f"暂不支持的数据类型：{data_type}")

def swap_rows(db, table, factor_col, columns, factor_values, host='127.0.0.1', user='root', password='123456'):
    if len(factor_values) != 2:
        raise ValueError("factor_values 参数必须包含两个因子值。")
    if factor_col not in columns:
        columns.append(factor_col)
    engine = create_db_connection(db, host, user, password)
    data_type = get_column_data_type(engine, db, table, factor_col)
    temp_val = generate_temp_val(engine, db, table, factor_col, data_type)
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            query = f"SELECT {', '.join(columns)} FROM {table} WHERE {factor_col} IN (:val1, :val2)"
            result = conn.execute(text(query), {"val1": factor_values[0], "val2": factor_values[1]}).fetchall()

            if len(result) != 2:
                raise ValueError("未找到指定的两个因子，无法进行交换。")
            row_dict = {}
            for row in result:
                key = row[columns.index(factor_col)]
                row_dict[key] = dict(zip(columns, row))

            try:
                row1 = row_dict[factor_values[0]]
                row2 = row_dict[factor_values[1]]
            except KeyError as e:
                raise ValueError(f"因子值 {e} 未找到对应的行。")
            update_temp = f"UPDATE {table} SET {factor_col} = :temp WHERE {factor_col} = :val1"
            conn.execute(text(update_temp), {"temp": temp_val, "val1": factor_values[0]})
            update_row2 = f"UPDATE {table} SET {', '.join([f'{col} = :val_{col}' for col in columns])} WHERE {factor_col} = :val2"
            params_row2 = {f"val_{col}": row1[col] for col in columns}
            params_row2["val2"] = factor_values[1]
            conn.execute(text(update_row2), params_row2)
            update_row1 = f"UPDATE {table} SET {', '.join([f'{col} = :val_{col}' for col in columns])} WHERE {factor_col} = :temp"
            params_row1 = {f"val_{col}": row2[col] for col in columns}
            params_row1["temp"] = temp_val
            conn.execute(text(update_row1), params_row1)
            trans.commit()
            print("因子交换成功。")
        except Exception as e:
            trans.rollback()
            print(f"因子交换失败：{e}")

def create_db_connection(db_name: str, host: str = '127.0.0.1', user: str = 'root', password: str = '123456') -> Engine:
    """创建与 MySQL 数据库的连接"""
    connect_info = f'mysql+pymysql://{user}:{password}@{host}/{db_name}?charset=utf8'
    engine = create_engine(connect_info, echo=False, future=True)
    return engine

def check_or_create_table(db_name: str, table_name: str, dataframe: pd.DataFrame, primary_key_column: str) -> Table:
    """检查表是否存在，不存在则根据 DataFrame 创建新表"""
    engine = create_db_connection(db_name)
    metadata = MetaData()
    metadata.reflect(bind=engine)

    if table_name not in metadata.tables:
        columns = []
        for col_name, dtype in dataframe.dtypes.items():
            if pd.api.types.is_integer_dtype(dtype):
                col_type = Integer
            elif pd.api.types.is_float_dtype(dtype):
                col_type = Float
            elif pd.api.types.is_datetime64_any_dtype(dtype):
                col_type = DateTime
            else:
                col_type = String(255)

            if col_name == primary_key_column:
                columns.append(Column(col_name, col_type, primary_key=True))
            else:
                columns.append(Column(col_name, col_type))

        table = Table(table_name, metadata, *columns)
        metadata.create_all(engine)
        print(f"Created table `{table_name}` with columns: {', '.join([col.name for col in table.columns])}")
    else:
        table = metadata.tables[table_name]
        print(f"Table `{table_name}` already exists with columns: {', '.join([col.name for col in table.columns])}")
    return table

def add_missing_columns(db_name: str, table_name: str, dataframe: pd.DataFrame):
    """动态添加缺失的列到表中"""
    engine = create_db_connection(db_name)
    inspector = inspect(engine)
    existing_columns = inspector.get_columns(table_name)
    existing_column_names = {col['name'] for col in existing_columns}

    missing_columns = [col for col in dataframe.columns if col not in existing_column_names]
    if not missing_columns:
        print("No missing columns to add.")
        return

    with engine.connect() as conn:
        for column in missing_columns:
            dtype = dataframe[column].dtype
            if pd.api.types.is_integer_dtype(dtype):
                new_column_type = 'INTEGER'
            elif pd.api.types.is_float_dtype(dtype):
                new_column_type = 'FLOAT'
            elif pd.api.types.is_datetime64_any_dtype(dtype):
                new_column_type = 'DATETIME'
            else:
                new_column_type = 'VARCHAR(255)'

            alter_table_stmt = text(f"ALTER TABLE `{table_name}` ADD COLUMN `{column}` {new_column_type}")
            try:
                conn.execute(alter_table_stmt)
                print(f"Added column `{column}` with type `{new_column_type}` to table `{table_name}`.")
            except SQLAlchemyError as e:
                print(f"Error adding column `{column}`: {e}")
                raise
        conn.commit()

def replace_nan_with_none(data_dicts):
    for row in data_dicts:
        for key, value in row.items():
            if isinstance(value, float) and math.isnan(value):
                row[key] = None
    return data_dicts

def upsert_dataframe_to_mysql(db_name: str, table_name: str, dataframe: pd.DataFrame, primary_key_column: str):
    """将 DataFrame 数据进行 upsert 到 MySQL 表中"""
    if dataframe.empty:
        print(f"DataFrame for table `{table_name}` is empty, skipping upsert.")
        return

    # 使用上下文管理器来创建和关闭数据库连接
    engine = create_db_connection(db_name)

    # 检查或创建表
    table = check_or_create_table(db_name, table_name, dataframe, primary_key_column)
    add_missing_columns(db_name, table_name, dataframe)

    # 重新反射表的结构，确保新添加的列被识别
    metadata = MetaData()
    metadata.reflect(bind=engine, only=[table_name])
    table = metadata.tables[table_name]

    # 打印表的列名以进行调试
    print(f"Table columns after reflection: {table.columns.keys()}")

    # 确保 '日期' 列存在并且没有缺失��
    if '日期' not in dataframe.columns:
        print(f"DataFrame for table `{table_name}` is missing '日期' column.")
        return

    # 确保 '日期' 列为 datetime 类型
    dataframe['日期'] = pd.to_datetime(dataframe['日期']).dt.date

    # 替换 NaN 为 None
    dataframe = dataframe.where(pd.notnull(dataframe), None)

    # 准备数据列表
    data_dicts = dataframe.to_dict(orient='records')

    # 确保所有 NaN 被替换为 None
    data_dicts = replace_nan_with_none(data_dicts)

    # 检查 '日期' 列是否有 None
    valid_data_dicts = []
    for row in data_dicts:
        if row.get('日期') is not None:
            valid_data_dicts.append(row)
        else:
            print(f"Warning: Row is missing '日期' value and will be skipped: {row}")

    if not valid_data_dicts:
        print(f"No valid data to upsert into `{table_name}`.")
        return

    # 构建插入语句，使用 ON DUPLICATE KEY UPDATE 实现 upsert
    stmt = insert(table).values(valid_data_dicts)

    # 仅更新当前 DataFrame 中存在的列，排除主键
    update_cols = {col.name: stmt.inserted[col.name]
                   for col in table.columns
                   if col.name != primary_key_column and col.name in dataframe.columns}

    upsert_stmt = stmt.on_duplicate_key_update(update_cols)

    # 在这里使用 with 语句来处理连接
    try:
        with engine.begin() as conn:
            conn.execute(upsert_stmt)
            print(f"Upserted {len(valid_data_dicts)} records into `{table_name}`.")
    except SQLAlchemyError as e:
        print(f"Error during upsert operation: {e}")
        raise
    finally:
        engine.dispose()