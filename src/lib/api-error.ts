import axios from 'axios';

export function httpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
export function apiErrorMessage(error: unknown, fallback = 'Chưa thể thực hiện thao tác. Vui lòng thử lại.'): string {
  const status = httpStatus(error);
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 404) return 'Dữ liệu không còn tồn tại hoặc chưa sẵn sàng.';
  if (status === 409) return 'Dữ liệu đã thay đổi hoặc số lượng vượt tồn kho. Kiểm tra lại trước khi tiếp tục.';
  if (!status || status >= 500) return 'Không thể kết nối dịch vụ. Vui lòng thử lại sau.';
  if (status === 400) return 'Thông tin chưa hợp lệ. Kiểm tra các trường và thử lại.';
  return fallback;
}
export function retryRead(failures: number, error: unknown): boolean {
  const status = httpStatus(error);
  return failures < 1 && (!status || status >= 500);
}
