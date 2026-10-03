import Link from 'next/link';
export default function AboutPage() {
  return <div className="app-shell page"><article className="prose"><div className="eyebrow">Flash Store</div><h1>Về cửa hàng</h1>
    <p>Flash Store là giao diện mua sắm của dự án ecommerce: xem danh mục, chọn biến thể, quản lý giỏ hàng và theo dõi đơn mua.</p>
    <section><h2>Thông tin từ danh mục</h2><p>Giá, hình ảnh và biến thể được hiển thị từ dữ liệu cửa hàng. Tồn kho được kiểm tra theo từng kích cỡ khi bạn chọn sản phẩm.</p></section>
    <section><h2>Tài khoản của bạn</h2><p>Đăng nhập để lưu địa chỉ giao hàng, sử dụng giỏ hàng và xem đơn mua. Danh sách yêu thích được lưu riêng trên trình duyệt.</p></section>
    <Link href="/products" className="app-primary-btn mt-8">Xem sản phẩm</Link>
  </article></div>;
}
