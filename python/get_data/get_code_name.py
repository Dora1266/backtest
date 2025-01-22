import akshare as ak
stock_zh_a_spot_em_df = ak.stock_zh_a_spot_em()
stock_codes = stock_zh_a_spot_em_df['代码'].unique().tolist()
sorted_codes = sorted(stock_codes)
with open('stock_codes.txt', 'w', encoding='utf-8') as f:
    formatted_codes = ','.join(sorted_codes)
    f.write(formatted_codes)
print("股票代码已按升序格式化并保存到 stock_codes.txt 文件中。")