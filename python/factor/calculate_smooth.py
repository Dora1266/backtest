import numpy as np
import pandas as pd
def calculate_profit(df, price_bins=100, window_size=250):
        """

        基于筹码分布计算股票的获利盘比例，其优化版本。

        

        Parameters:

        df: pandas DataFrame，包含股票的历史数据，必须包含以下列：

            - '日期'

            - '开盘_前复权'

            - '收盘_前复权'

            - '成交量_前复权'

            - '成交额_前复权'

    

        price_bins (int): 定义价格的区间数，用来划分每格之间的平均价格水平

        window_size (int): 滚动窗口的大小

        

        Returns:

        DataFrame: 包含日期和对应的获利盘比例

        """

        

        # 确保数据按日期升序排列

        df = df.sort_values(by='日期').reset_index(drop=True)

    

        # 最小价到最大价，划分为price_bins个价格段

        min_price = df['收盘_前复权'].min()

        max_price = df['收盘_前复权'].max()

        price_range = np.linspace(min_price, max_price, price_bins)

        

        # 存储每个价格区间的累计成交量

        total_volume_at_price = np.zeros(price_bins)

    

        # 结果列表

        result_list = []

    

        # 获取收盘价和成交量的数据

        close_prices = df['收盘_前复权'].values

        volumes = df['成交量_前复权'].values

    

        # 将价格映射到相应区间

        price_indices = np.digitize(close_prices, price_range) - 1  # 获取每个收盘价所在区间索引

        

        for idx in range(len(df)):

            if idx >= window_size:

                # 减去滑出窗口的旧索引成交量影响

                old_idx = idx - window_size

                total_volume_at_price[price_indices[old_idx]] -= volumes[old_idx]

    

            # 增加当前价格区间的成交量

            total_volume_at_price[price_indices[idx]] += volumes[idx]

    

            # 计算当前滚动窗口内的总成交量

            total_volume = np.sum(total_volume_at_price)

    

            if total_volume > 0:

                # 获利盘：小于当前收盘价的价格区间的成交量

                profitable_volume = np.sum(total_volume_at_price[price_range < close_prices[idx]])

                profit_plate_ratio = profitable_volume / total_volume

            else:

                profit_plate_ratio = 0

    

            result_list.append([df.iloc[idx]['日期'], profit_plate_ratio])

    

        # 返回获利盘比例的结果 DataFrame

        result_df = pd.DataFrame(result_list, columns=['日期', '获利盘比例'])

    

        return result_df