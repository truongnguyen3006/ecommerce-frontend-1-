import axios from 'axios';

export function httpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
export function apiErrorMessage(error: unknown, fallback = 'Chưa thể thực hiện thao tác. Vui lòng thử lại.'): string {
  const status = httpStatus(error);
  const code = axios.isAxiosError(error) ? error.response?.data?.code : undefined;
  const messages: Record<string,string> = {
    SKU_RESERVED: 'Mã SKU đã được sử dụng hoặc đã nghỉ bán và không thể tái sử dụng. Vui lòng chọn mã SKU mới.',
    UPLOAD_NOT_CONFIGURED: 'Dịch vụ tải ảnh chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
    PAYMENT_NOT_CONFIGURED: 'Thanh toán VNPay chưa được cấu hình. Vui lòng liên hệ hỗ trợ.',
    ONLINE_PAYMENT_IN_FLIGHT: 'Thanh toán trực tuyến đã bắt đầu hoặc cần đối soát. Đơn chưa thể hủy; vui lòng chờ kết quả hoặc liên hệ hỗ trợ.',
    INSUFFICIENT_STOCK: 'Số lượng vượt tồn kho hiện tại. Vui lòng kiểm tra lại số lượng.',
    CHECKOUT_IN_PROGRESS: 'Giỏ hàng đang được xử lý. Vui lòng chờ kết quả đặt hàng.',
    CART_EMPTY: 'Giỏ hàng chưa có sản phẩm.',
    PRODUCT_REVISION_CONFLICT: 'Sản phẩm đã được người khác thay đổi. Hãy tải lại và xem xét trước khi lưu.',
    INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu chưa đúng.',
    INVALID_REFRESH_TOKEN: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    ACCOUNT_DISABLED: 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.',
    AUTH_FORBIDDEN: 'Tài khoản chưa được phép đăng nhập.',
    AUTH_UPSTREAM_UNAVAILABLE: 'Dịch vụ đăng nhập tạm thời không khả dụng. Vui lòng thử lại sau.',
    AUTH_CONFIGURATION_UNAVAILABLE: 'Dịch vụ đăng nhập đang gặp lỗi cấu hình. Vui lòng liên hệ hỗ trợ.',
    AUTH_UPSTREAM_INVALID_RESPONSE: 'Dịch vụ đăng nhập trả về dữ liệu chưa hợp lệ. Vui lòng thử lại sau.',
    SKU_IDENTITY_UNAVAILABLE: 'Chưa kiểm tra được danh tính SKU. Vui lòng thử lại sau.',
    IDEMPOTENCY_CONFLICT: 'Mã thao tác đã dùng cho yêu cầu khác. Kiểm tra kết quả trước khi tiếp tục.',
    IDEMPOTENCY_KEY_REQUIRED: 'Thiếu mã thao tác. Hãy tải lại trang và thử lại.',
    PROVISIONING_RECONCILIATION_REQUIRED: 'Tài khoản cần được hỗ trợ đối soát. Vui lòng liên hệ quản trị viên.',
    CHECKOUT_NOT_ACCEPTED: 'Đơn chưa được chấp nhận. Giỏ hàng được giữ nguyên.',
    PROVISIONING_RETRY: 'Đăng ký chưa hoàn tất. Vui lòng thử lại với cùng thông tin.',
    USER_ALREADY_EXISTS: 'Tài khoản đã tồn tại. Vui lòng đăng nhập hoặc dùng thông tin khác.',
  };
  if (typeof code === 'string' && messages[code]) return messages[code];
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 413) return 'Ảnh vượt giới hạn tải lên: tối đa 10 MB mỗi tệp, tổng 48 MB và không quá 20 tệp.';
  if (status === 404) return 'Dữ liệu không còn tồn tại hoặc chưa sẵn sàng.';
  if (status === 409 && axios.isAxiosError(error) && error.response?.data?.message === 'ONLINE_PAYMENT_IN_FLIGHT')
    return 'Thanh toán trực tuyến đã bắt đầu hoặc cần đối soát. Đơn chưa thể hủy; vui lòng chờ kết quả hoặc liên hệ hỗ trợ.';
  if (status === 409) return 'Thao tác xung đột với dữ liệu hiện tại. Hãy tải lại và kiểm tra trước khi tiếp tục.';
  if (!status || status >= 500) return 'Không thể kết nối dịch vụ. Vui lòng thử lại sau.';
  if (status === 400) return 'Thông tin chưa hợp lệ. Kiểm tra các trường và thử lại.';
  return fallback;
}
export function retryRead(failures: number, error: unknown): boolean {
  const status = httpStatus(error);
  return failures < 1 && (!status || status >= 500);
}
