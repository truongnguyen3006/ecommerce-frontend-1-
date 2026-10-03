import Link from 'next/link';
export default function HelpPage() {
  return <div className="app-shell page"><article className="prose"><div className="eyebrow">Trợ giúp</div><h1>Hướng dẫn mua hàng</h1>
    <section><h2>Chọn sản phẩm</h2><p>Tìm sản phẩm theo từ khóa, danh mục, màu, kích cỡ hoặc khoảng giá. Mở trang chi tiết, chọn kích cỡ còn hàng rồi thêm vào giỏ.</p></section>
    <section><h2>Đặt hàng</h2><p>Đăng nhập, kiểm tra giỏ, chọn địa chỉ và COD hoặc VNPay. Sau khi gửi đơn, trang theo dõi sẽ cập nhật kết quả kiểm tra tồn kho.</p></section>
    <section><h2>Thanh toán và hủy đơn</h2><p>VNPay khả dụng khi đơn đã được xác nhận tồn kho. Các thao tác thanh toán hoặc hủy chỉ xuất hiện khi trạng thái đơn cho phép. Nếu đơn xử lý thất bại, giỏ hàng được giữ để bạn kiểm tra lại.</p></section>
    <section><h2>Quản lý địa chỉ</h2><p>Thêm, sửa hoặc chọn địa chỉ mặc định tại hồ sơ. Đơn đã tạo lưu thông tin người nhận tại thời điểm đặt.</p></section>
    <div className="flex gap-3 flex-wrap mt-8"><Link href="/profile" className="app-primary-btn">Hồ sơ & địa chỉ</Link><Link href="/orders" className="app-secondary-btn">Xem đơn hàng</Link></div>
  </article></div>;
}
