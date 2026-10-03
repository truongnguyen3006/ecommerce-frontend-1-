'use client';
import { App, Button, Switch, Table } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userManagementApi, type UserResponse } from '@/services/userManagementApi';
import { useAuthStore } from '@/store/useAuthStore';
import { apiErrorMessage } from '@/lib/api-error';
import { freshAccessToken } from '@/lib/axiosClient';
import { hasAdminRole } from '@/lib/auth';
import PageState from '@/components/ui/PageState';
export default function AdminUsers() {
  const { user } = useAuthStore(), { modal, message } = App.useApp(), queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-users'], queryFn: userManagementApi.getAll });
  const change = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => { await freshAccessToken(); return userManagementApi.updateStatus(id, enabled); },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-users'] }); message.success('Đã cập nhật tài khoản.'); },
    onError: (error) => message.error(apiErrorMessage(error)),
  });
  return <section><div className="page-heading"><div><h1>Người dùng</h1><p>Thông tin liên hệ và trạng thái truy cập tài khoản.</p></div><Button loading={query.isFetching} onClick={() => void query.refetch()}>Tải lại</Button></div>
    {query.isError ? <PageState title="Chưa thể tải người dùng" description={apiErrorMessage(query.error)} retry={() => void query.refetch()} /> :
      <div className="table-wrap"><Table<UserResponse> dataSource={query.data || []} rowKey="id" loading={query.isPending} scroll={{ x: 880 }} pagination={{ pageSize: 10 }} locale={{ emptyText: 'Chưa có người dùng' }} columns={[
        { title: 'Người dùng', dataIndex: 'fullName', render: (name: string, record) => name || record.keycloakId },
        { title: 'Liên hệ', render: (_, record) => <div>{record.email}<p className="text-sm muted">{record.phoneNumber}</p></div> },
        { title: 'Vai trò', render: (_, record) => record.roles?.length ? record.roles.join(', ') : 'Chưa có dữ liệu vai trò' },
        { title: 'Địa chỉ', dataIndex: 'address' },
        { title: 'Trạng thái', width: 170, render: (_, record) => {
          const self = record.keycloakId === user?.keycloakId || record.id === user?.id;
          return <div><p className="text-sm mb-2">{record.status ? 'Hoạt động' : 'Đã khóa'}</p><Switch checked={record.status} aria-label={`Trạng thái ${record.fullName || record.email}`} disabled={self || !hasAdminRole(user?.roles) || change.isPending}
            onChange={(enabled) => modal.confirm({ title: enabled ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?', content: record.fullName || record.email, okText: 'Xác nhận', cancelText: 'Hủy', onOk: () => change.mutateAsync({ id: record.id, enabled }) })} />
            {self && <p className="text-xs muted mt-2">Tài khoản đang sử dụng</p>}
          </div>;
        } },
      ]} /></div>}
  </section>;
}
