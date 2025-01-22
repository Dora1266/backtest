import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const data = await req.json();  // 从请求体中获取 JSON 数据
  const select = data.select;
  const tablename = data.table_name;  // 获取搜索字符串
  const dbname = data.db_name;  // 获取数据库名称
  const key = data.key;

  if (!select || !dbname) {
    return NextResponse.json({ error: "股票代码和名称是必需的" }, { status: 400 });
  }

  try {
    const response = await fetch(
        `http://127.0.0.1:5000/add_data`, {
          method: 'POST',  // 向后端服务发送 POST 请求
          headers: {
            'Content-Type': 'application/json',  // 设置内容类型
          },
          body: JSON.stringify({
            select,  // 修改为模板字符串
            table_name: tablename,  // 修正变量名为 camelCase
            db_name: dbname,
            key:key
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
