'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { App, Button, Form, Input } from 'antd';
import { authApi, type RegisterRequest } from '@/services/authApi';
import { apiErrorMessage, httpStatus } from '@/lib/api-error';

export default function RegisterPage() {
  const router = useRouter(), params = useSearchParams();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false), [errorText, setErrorText] = useState('');
  const submit = async (values: RegisterRequest) => {
    setLoading(true); setErrorText('');
    try {
      await authApi.register(values);
      message.success('Đã tạo tài khoản. Bạn có thể đăng nhập.');
      router.push(`/login${params.get('next') ? '?next=' + encodeURIComponent(params.get('next')!) : ''}`);
    } catch (error) {
      setErrorText(httpStatus(error) === 409 ? 'Tên đăng nhập hoặc email đã được sử dụng.' : apiErrorMessage(error));
    } finally { setLoading(false); }
  };
  return <div className="auth-page"><Link href="/" className="auth-brand brand">FLASH<span>STORE</span></Link>
    <section className="auth-form"><h1>Tạo tài khoản</h1><p>Lưu thông tin nhận hàng và theo dõi đơn mua.</p>
      {errorText && <div className="form-error" role="alert">{errorText}</div>}
      <Form<RegisterRequest> layout="vertical" onFinish={submit} requiredMark={false} disabled={loading} scrollToFirstError>
        <Form.Item label="Tên đăng nhập" name="username" rules={[{ required: true, whitespace: true, message: 'Nhập tên đăng nhập.' }]}><Input autoComplete="username" maxLength={255} /></Form.Item>
        <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Nhập email.' }, { type: 'email', message: 'Email chưa đúng định dạng.' }]}><Input type="email" autoComplete="email" maxLength={255} /></Form.Item>
        <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Nhập mật khẩu.' }, { min: 8, max: 128, message: 'Mật khẩu cần từ 8 đến 128 ký tự.' }]}><Input.Password autoComplete="new-password" maxLength={128} /></Form.Item>
        <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true, whitespace: true, message: 'Nhập họ và tên.' }]}><Input autoComplete="name" maxLength={255} /></Form.Item>
        <Form.Item label="Số điện thoại" name="phoneNumber"><Input type="tel" autoComplete="tel" maxLength={255} /></Form.Item>
        <Form.Item label="Địa chỉ liên hệ" name="address"><Input.TextArea rows={2} autoComplete="street-address" maxLength={255} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>Tạo tài khoản</Button>
      </Form><p className="auth-bottom">Đã có tài khoản? <Link href="/login" className="text-link">Đăng nhập</Link></p>
    </section>
  </div>;
}
