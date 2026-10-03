'use client';
import { useState } from 'react';
import { App, Button, Form, Input, Modal, Switch } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addressApi, type UserAddress, type UserAddressRequest } from '@/services/addressApi';
import { useAddresses } from '@/lib/queries';
import { apiErrorMessage } from '@/lib/api-error';
import { freshAccessToken } from '@/lib/axiosClient';
import PageState from '@/components/ui/PageState';

export function AddressEditor({ address, defaultAddress, onClose }: { address?: UserAddress; defaultAddress?: boolean; onClose: () => void }) {
  const [form] = Form.useForm<UserAddressRequest>();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const save = useMutation({
    mutationFn: async (values: UserAddressRequest) => {
      await freshAccessToken();
      return address ? addressApi.updateAddress(address.id, values) : addressApi.createAddress(values);
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['addresses'] }); message.success('Đã lưu địa chỉ.'); onClose(); },
    onError: (error) => message.error(apiErrorMessage(error)),
  });
  return <Modal title={address ? 'Sửa địa chỉ' : 'Thêm địa chỉ'} open onCancel={onClose} onOk={() => form.submit()} okText="Lưu địa chỉ" cancelText="Hủy" confirmLoading={save.isPending} maskClosable={!save.isPending}>
    <Form<UserAddressRequest> form={form} layout="vertical" requiredMark={false} disabled={save.isPending}
      initialValues={address || { isDefault: defaultAddress || false }} onFinish={(values) => save.mutate(values)} className="mt-6">
      <Form.Item label="Nhãn địa chỉ" name="label"><Input maxLength={64} placeholder="Nhà riêng, cơ quan…" /></Form.Item>
      <Form.Item label="Người nhận" name="recipientName" rules={[{ required: true, whitespace: true, message: 'Nhập tên người nhận.' }]}><Input autoComplete="name" maxLength={128} /></Form.Item>
      <Form.Item label="Số điện thoại" name="recipientPhone" rules={[{ required: true, whitespace: true, message: 'Nhập số điện thoại.' }]}><Input type="tel" autoComplete="tel" maxLength={32} /></Form.Item>
      <Form.Item label="Địa chỉ giao hàng" name="addressLine" rules={[{ required: true, whitespace: true, message: 'Nhập địa chỉ giao hàng.' }]}><Input.TextArea autoComplete="street-address" rows={3} maxLength={512} /></Form.Item>
      <Form.Item label="Địa chỉ mặc định" name="isDefault" valuePropName="checked"><Switch aria-label="Địa chỉ mặc định" /></Form.Item>
    </Form>
  </Modal>;
}
export default function AddressBook() {
  const query = useAddresses(), queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const [editor, setEditor] = useState<UserAddress | 'new' | null>(null);
  const mutate = useMutation({
    mutationFn: async ({ id, operation }: { id: number; operation: 'default' | 'delete' }) => {
      await freshAccessToken();
      if (operation === 'default') await addressApi.setDefaultAddress(id); else await addressApi.deleteAddress(id);
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['addresses'] }); message.success('Đã cập nhật sổ địa chỉ.'); },
    onError: (error) => message.error(apiErrorMessage(error)),
  });
  return <section><div className="section-header"><h2>Địa chỉ giao hàng</h2><Button onClick={() => setEditor('new')}>Thêm địa chỉ</Button></div>
    {query.isPending ? <div role="status">Đang tải địa chỉ…</div> : query.isError ? <PageState title="Chưa thể tải địa chỉ" description={apiErrorMessage(query.error)} retry={() => void query.refetch()} /> :
      !query.data.length ? <PageState title="Chưa có địa chỉ" description="Thêm người nhận và địa chỉ để sử dụng khi đặt hàng." /> : query.data.map((address) => <article key={address.id} className="address-row">
        <div className="flex flex-wrap gap-3 items-center"><strong>{address.recipientName}</strong>{address.isDefault && <span className="app-status-pill">Mặc định</span>}{address.label && <span className="text-sm muted">{address.label}</span>}</div>
        <p>{address.recipientPhone}</p><p>{address.addressLine}</p><div className="address-actions">
          <Button disabled={mutate.isPending} onClick={() => setEditor(address)}>Sửa</Button>
          {!address.isDefault && <Button disabled={mutate.isPending} onClick={() => mutate.mutate({ id: address.id, operation: 'default' })}>Đặt mặc định</Button>}
          <Button disabled={mutate.isPending} onClick={() => modal.confirm({ title: 'Xóa địa chỉ?', content: address.addressLine, okText: 'Xóa địa chỉ', cancelText: 'Hủy', onOk: () => mutate.mutateAsync({ id: address.id, operation: 'delete' }) })}>Xóa</Button>
        </div>
      </article>)}
    {editor && <AddressEditor address={editor === 'new' ? undefined : editor} defaultAddress={!query.data?.length} onClose={() => setEditor(null)} />}
  </section>;
}
