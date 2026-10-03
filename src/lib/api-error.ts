import axios from 'axios';

export function httpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
export function apiErrorMessage(error: unknown, fallback = 'Chưa thể thực hiện thao tác. Vui lòng thử lại.'): string {
  const status = httpStatus(error);
  if (axios.isAxiosError(error) && error.response?.data?.code === 'SKU_RESERVED') return 'Mã SKU đã được sử dụng hoặc đã nghỉ bán và không thể tái sử dụng. Vui lòng chọn mã SKU mới.';
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 413) return 'Ảnh vượt giới hạn tải lên: tối đa 10 MB mỗi tệp, tổng 48 MB và không quá 20 tệp.';
  if (status === 404) return 'Dữ liệu không còn tồn tại hoặc chưa sẵn sàng.';
  if (status === 409 && axios.isAxiosError(error) && error.response?.data?.message === 'ONLINE_PAYMENT_IN_FLIGHT')
    return 'Thanh toán trực tuyến đã bắt đầu hoặc cần đối soát. Đơn chưa thể hủy; vui lòng chờ kết quả hoặc liên hệ hỗ trợ.';
  if (status === 409) return 'Dữ liệu đã thay đổi hoặc số lượng vượt tồn kho. Kiểm tra lại trước khi tiếp tục.';
  if (!status || status >= 500) return 'Không thể kết nối dịch vụ. Vui lòng thử lại sau.';
  if (status === 400) return 'Thông tin chưa hợp lệ. Kiểm tra các trường và thử lại.';
  return fallback;
}
export function retryRead(failures: number, error: unknown): boolean {
  const status = httpStatus(error);
  return failures < 1 && (!status || status >= 500);
}
