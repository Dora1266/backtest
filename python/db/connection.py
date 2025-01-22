# db/connection.py
from sqlalchemy import create_engine

def create_db_connection(db_name, host='127.0.0.1', user='root', password='123456'):
    connect_info = f'mysql+pymysql://{user}:{password}@{host}/{db_name}?charset=utf8'
    engine = create_engine(connect_info)
    return engine
