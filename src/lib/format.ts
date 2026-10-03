export const formatMoney = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
export function formatDate(value: string): string {
  if (!value) return 'Chưa có ngày đặt';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? 'Chưa có ngày đặt' : date.toLocaleString('vi-VN');
}
