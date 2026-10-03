'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { App, Button, Form, Input } from 'antd';
import { authApi, type LoginRequest } from '@/services/authApi';
import { useAuthStore } from '@/store/useAuthStore';
import { hasAdminRole } from '@/lib/auth';
import { safeReturnPath } from '@/lib/auth-navigation';
import { apiErrorMessage } from '@/lib/api-error';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const handleLogin = async (values: LoginRequest) => {
    setLoading(true); setErrorText('');
    try {
      const session = await authApi.login({ username: values.username.trim(), password: values.password });
      sessionStorage.setItem('refresh_token', session.refresh_token);
      useAuthStore.getState().login(session.access_token);
      if (!useAuthStore.getState().isAuthenticated) throw new Error('Invalid session');
      try {
        const user = await authApi.getMe();
        const access = sessionStorage.getItem('access_token');
        if (access) useAuthStore.getState().login(access, user);
      } catch {
        if (!useAuthStore.getState().isAuthenticated) throw new Error('Session expired');
        message.info('Đã đăng nhập. Hồ sơ sẽ được tải lại khi bạn mở tài khoản.');
      }
      router.replace(safeReturnPath(params.get('next'), hasAdminRole(useAuthStore.getState().user?.roles) ? '/admin' : '/'));
    } catch (error) {
      useAuthStore.getState().logout();
      setErrorText(apiErrorMessage(error));
    } finally { setLoading(false); }
  };
  return <div className="auth-page"><Link href="/" className="auth-brand brand">FLASH<span>STORE</span></Link>
    <section className="auth-form"><h1>Đăng nhập</h1><p>Truy cập giỏ hàng và đơn mua của bạn.</p>
      {errorText && <div className="form-error" role="alert">{errorText}</div>}
      <Form<LoginRequest> layout="vertical" requiredMark={false} onFinish={handleLogin} disabled={loading}>
        <Form.Item label="Tên đăng nhập" name="username" rules={[{ required: true, whitespace: true, message: 'Nhập tên đăng nhập.' }]}><Input autoComplete="username" maxLength={255} /></Form.Item>
        <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Nhập mật khẩu.' }]}><Input.Password autoComplete="current-password" /></Form.Item>
        <Button htmlType="submit" type="primary" loading={loading} block>Đăng nhập</Button>
      </Form><p className="auth-bottom">Chưa có tài khoản? <Link href={`/register${params.get('next') ? '?next=' + encodeURIComponent(params.get('next')!) : ''}`} className="text-link">Đăng ký</Link></p>
    </section>
  </div>;
}
