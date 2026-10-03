'use client';
import { useEffect, useState } from 'react';
import { App, Button, Form, Input } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, type UpdateProfileRequest } from '@/services/authApi';
import { useAuthStore } from '@/store/useAuthStore';
import { freshAccessToken } from '@/lib/axiosClient';
import { apiErrorMessage } from '@/lib/api-error';
import AccountNav from '@/components/AccountNav';
import AddressBook from '@/components/AddressBook';
import PageState from '@/components/ui/PageState';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm<UpdateProfileRequest>();
  const queryClient = useQueryClient(), { message } = App.useApp();
  const query = useQuery({ queryKey: ['me', user?.keycloakId], queryFn: authApi.getMe });
  useEffect(() => { if (query.data) form.setFieldsValue(query.data); }, [query.data, form]);
  const save = useMutation({
    mutationFn: async (values: UpdateProfileRequest) => { await freshAccessToken(); return authApi.updateProfile(values); },
    onSuccess: async (updated) => {
      const access = sessionStorage.getItem('access_token');
      if (access) useAuthStore.getState().login(access, updated);
      await queryClient.invalidateQueries({ queryKey: ['me'] }); setEditing(false); message.success('Đã lưu hồ sơ.');
    },
    onError: (error) => message.error(apiErrorMessage(error)),
  });
  return <div className="app-shell page"><div className="page-heading"><div><h1>Tài khoản của tôi</h1><p>Thông tin liên hệ và địa chỉ nhận hàng.</p></div></div>
    <div className="account-layout"><AccountNav /><div className="profile-columns">
      <section><div className="section-header"><h2>Hồ sơ</h2>{!editing && <Button onClick={() => setEditing(true)}>Chỉnh sửa</Button>}</div>
        {query.isPending ? <div role="status">Đang tải hồ sơ…</div> : query.isError ? <PageState title="Chưa thể tải hồ sơ" description={apiErrorMessage(query.error)} retry={() => void query.refetch()} /> :
          <Form<UpdateProfileRequest> form={form} layout="vertical" requiredMark={false} disabled={!editing || save.isPending} onFinish={(values) => save.mutate(values)}>
            <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true, whitespace: true, message: 'Nhập họ và tên.' }]}><Input autoComplete="name" maxLength={255} /></Form.Item>
            <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Email chưa đúng định dạng.' }]}><Input type="email" autoComplete="email" maxLength={255} /></Form.Item>
            <Form.Item label="Số điện thoại" name="phoneNumber"><Input type="tel" autoComplete="tel" maxLength={255} /></Form.Item>
            <Form.Item label="Địa chỉ liên hệ" name="address"><Input.TextArea rows={3} maxLength={255} autoComplete="street-address" /></Form.Item>
            {editing && <div className="flex gap-3"><Button disabled={save.isPending} onClick={() => { form.setFieldsValue(query.data!); setEditing(false); }}>Hủy</Button><Button type="primary" htmlType="submit" loading={save.isPending}>Lưu hồ sơ</Button></div>}
          </Form>}
      </section><AddressBook />
    </div></div>
  </div>;
}
