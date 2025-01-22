import json


def sort_json_by_key(data, key, ascending=True):
    try:
        # 获取指定主键列表
        keys = data[key]

        # 根据升序或降序确定排序方式
        if ascending:
            sorted_keys = sorted(keys)
        else:
            sorted_keys = sorted(keys, reverse=True)

        # 创建一个新的字典以存储排序后的数据
        sorted_data = {k: [] for k in data.keys()}

        # 根据排序后的主键填充新的字典
        for sorted_key in sorted_keys:
            index = keys.index(sorted_key)  # 找到当前排序主键的索引
            for k in data.keys():
                sorted_data[k].append(data[k][index])  # 填充对每个键

        return sorted_data

    except KeyError as e:
        print(f"Key error: {e}")
        return None


# 示例使用
json_data = {
    "code": [
        "000001", "000002", "000004", "000007", "000003",
        "000006", "000009", "000008", "600000", "000016",
        "000010", "000017", "000014", "000011", "000013",
        "000012", "000019", "000015", "000018", "000003"
    ],
    "name": [
        "平安银行", "万  科Ａ", "国华网安", "全新好", "PT金田A",
        "深振业Ａ", "中国宝安", "神州高铁", "浦发银行", "深康佳Ａ",
        "美丽生态", "深中华A", "沙河股份", "深物业A", "*ST石化A",
        "南  玻Ａ", "深粮控股", "PT中浩A", "神城A退", "000003"
    ],
    "收盘_不复权": [
        10.37, 7.12, 16.26, 5.55, 0,
        4.39, 7.79, 2.07, 0, 2.9,
        1.87, 5.5, 9.33, 8.17, 0,
        5.05, 5.99, 0, 0, 0
    ],
    "涨跌幅_不复权": [
        3.29, 2.74, 1.25, -1.94, 0,
        1.15, 5.27, 2.99, 0, 0.69,
        5.65, 4.17, 1.63, 1.62, 0,
        4.12, 2.92, 0, 0, 0
    ]
}

# 使用自定义的主键进行排序，这里以'code'作为主键，并进行升序排序
sorted_json_asc = sort_json_by_key(json_data, 'code', ascending=True)
print("升序排序结果:")
print(json.dumps(sorted_json_asc, ensure_ascii=False, indent=2))

# 使用自定义的主键进行排序，这里以'code'作为主键，并进行降序排序
sorted_json_desc = sort_json_by_key(json_data, 'code', ascending=False)
print("降序排序结果:")
print(json.dumps(sorted_json_desc, ensure_ascii=False, indent=2))
