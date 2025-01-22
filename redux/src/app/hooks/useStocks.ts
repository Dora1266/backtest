import { useEffect, useState } from 'react';
import { Stock } from '../types';

const useStocks = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await fetch(`/api/get_self_stocks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            db_name: process.env.NEXT_PUBLIC_DB_NAME,
            table_name: process.env.NEXT_PUBLIC_USER_SELECT_TABLE,
            user_db_name: process.env.NEXT_PUBLIC_USER_DB,
          }),
        });

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();

        if (!Array.isArray(data.code)) {
          throw new Error("返回的数据格式不正确");
        }

        const formattedStocks: Stock[] = data.code.map((code: string, index: number) => ({
          code,
          name: data.name[index],
          收盘_不复权: data.收盘_不复权[index],
          涨跌幅_不复权: data.涨跌幅_不复权[index],
        }));

        setStocks(formattedStocks);
      } catch (error: any) {
        console.error("Failed to fetch stocks:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  return { stocks, loading, error };
};

export default useStocks;
