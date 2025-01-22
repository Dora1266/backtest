import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const data = await req.json();  // 从请求体中获取 JSON 数据
  const search_string = data.search_string;  // 获取搜索字符串
  const core_db = data.core_db;  // 获取数据库名称
  const core_chinalist_table = data.core_chinalist_table

  if (!search_string || !core_db) {
    return NextResponse.json({ error: "搜索字符串和数据库名称是必需的" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/search_tables`, {
        method: 'POST',  // 向后端服务发送 POST 请求
        headers: {
          'Content-Type': 'application/json',  // 设置内容类型
        },
        body: JSON.stringify({
          search_string: search_string,
          core_db: core_db,
          core_chinalist_table:core_chinalist_table,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.error || "搜索失败" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "搜索时发生错误" }, { status: 500 });
  }
}
