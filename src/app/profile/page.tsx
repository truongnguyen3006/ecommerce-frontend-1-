'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Skeleton,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  EditOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  RollbackOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { UpdateProfileRequest, authApi } from '@/services/authApi';
import { addressApi, type UserAddress, type UserAddressRequest } from '@/services/addressApi';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, login } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [form] = Form.useForm<UpdateProfileRequest>();
  const [addressForm] = Form.useForm<UserAddressRequest>();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user) {
      form.setFieldsValue({
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
      });
    }
  }, [form, isAuthenticated, router, user]);

  const loadAddresses = async () => {
    setAddressLoading(true);
    try {
      const data = await addressApi.getMyAddresses();
      setAddresses(data);
    } catch (error) {
      console.error(error);
      message.error('Không thể tải danh sách địa chỉ.');
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void loadAddresses();
    }
  }, [isAuthenticated]);

  const joinedLabel = useMemo(() => new Date().getFullYear().toString(), []);

  const handleUpdate = async (values: UpdateProfileRequest) => {
    setLoading(true);
    try {
      const updatedUser = await authApi.updateProfile(values);
      const currentToken = sessionStorage.getItem('access_token');

      if (currentToken) {
        login(currentToken, updatedUser);
      }

      message.success('Cập nhật thông tin thành công.');
      setIsEditing(false);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        message.error(error.response.data?.message || 'Có lỗi xảy ra khi cập nhật.');
      } else if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error('Lỗi không xác định.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openCreateAddressModal = () => {
    setEditingAddress(null);
    addressForm.resetFields();
    addressForm.setFieldsValue({ isDefault: addresses.length === 0 });
    setIsAddressModalOpen(true);
  };

  const openEditAddressModal = (address: UserAddress) => {
    setEditingAddress(address);
    addressForm.setFieldsValue({
      label: address.label,
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      addressLine: address.addressLine,
      isDefault: address.isDefault,
    });
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async () => {
    try {
      const values = await addressForm.validateFields();
      setSavingAddress(true);
      if (editingAddress) {
        await addressApi.updateAddress(editingAddress.id, values);
        message.success('Đã cập nhật địa chỉ giao hàng.');
      } else {
        await addressApi.createAddress(values);
        message.success('Đã thêm địa chỉ giao hàng mới.');
      }
      setIsAddressModalOpen(false);
      await loadAddresses();
    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
      }
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await addressApi.setDefaultAddress(id);
      message.success('Đã cập nhật địa chỉ mặc định.');
      await loadAddresses();
    } catch (error) {
      console.error(error);
      message.error('Không thể cập nhật địa chỉ mặc định.');
    }
  };

  const handleDeleteAddress = (address: UserAddress) => {
    Modal.confirm({
      title: 'Xóa địa chỉ này?',
      content: 'Địa chỉ giao hàng sẽ bị xóa khỏi tài khoản của bạn.',
      okText: 'Xóa địa chỉ',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: async () => {
        try {
          await addressApi.deleteAddress(address.id);
          message.success('Đã xóa địa chỉ giao hàng.');
          await loadAddresses();
        } catch (error) {
          console.error(error);
          message.error('Không thể xóa địa chỉ giao hàng.');
        }
      },
    });
  };

  if (!user) {
    return (
      <div className="app-shell py-10">
        <div className="app-surface p-6">
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell animate-fade-in py-8 md:py-10">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Tài khoản của tôi</div>
          <Title level={2} className="!mb-2 !mt-2 !font-semibold !tracking-tight">
            Hồ sơ cá nhân và địa chỉ giao hàng
          </Title>
          <Text className="text-[var(--color-secondary)]">Cập nhật thông tin liên hệ và quản lý các địa chỉ giao hàng để checkout nhanh hơn.</Text>
        </div>
        {!isEditing ? (
          <Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
            Chỉnh sửa hồ sơ
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="app-surface border-0" bodyStyle={{ padding: 0 }}>
          <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] p-8 lg:border-b-0 lg:border-r">
              <div className="flex flex-col items-center text-center">
                <Avatar size={124} className="!bg-[var(--color-primary)] !text-white">
                  {(user.fullName || user.username || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight">{user.fullName || user.username}</h2>
                <p className="mt-2 text-sm text-[var(--color-secondary)]">{user.email || 'Email đang cập nhật'}</p>
                <Tag icon={<SafetyCertificateOutlined />} className="!mt-4 !rounded-full !border-0 !bg-[var(--color-primary)] !px-4 !py-1.5 !text-white">
                  Thành viên hệ thống
                </Tag>
              </div>

              <div className="mt-8 space-y-3 text-sm text-[var(--color-secondary)]">
                <div className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
                  <div className="font-semibold text-[var(--color-primary)]">Tên đăng nhập</div>
                  <div className="mt-1">{user.username || 'Đang cập nhật'}</div>
                </div>
                <div className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
                  <div className="font-semibold text-[var(--color-primary)]">Thành viên từ</div>
                  <div className="mt-1">{joinedLabel}</div>
                </div>
                <div className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
                  <div className="font-semibold text-[var(--color-primary)]">Số địa chỉ giao hàng</div>
                  <div className="mt-1">{addresses.length}</div>
                </div>
              </div>
            </aside>

            <section className="p-6 md:p-8">
              <Form<UpdateProfileRequest> form={form} layout="vertical" onFinish={handleUpdate} disabled={!isEditing} requiredMark={false} size="large">
                <div className="grid gap-4 md:grid-cols-2">
                  <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên.' }]}>
                    <Input placeholder="Nhập họ tên" />
                  </Form.Item>
                  <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Email không hợp lệ.' }]}>
                    <Input prefix={<MailOutlined className="text-[var(--color-muted)]" />} placeholder="name@example.com" />
                  </Form.Item>
                </div>

                <Form.Item label="Số điện thoại" name="phoneNumber">
                  <Input prefix={<PhoneOutlined className="text-[var(--color-muted)]" />} placeholder="09xxxxxxxx" />
                </Form.Item>

                <Form.Item label="Địa chỉ liên hệ chung" name="address">
                  <Input.TextArea rows={4} className="!resize-none" placeholder="Địa chỉ liên hệ hồ sơ (không thay thế danh sách địa chỉ giao hàng bên dưới)…" />
                </Form.Item>

                {isEditing ? (
                  <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[var(--color-border)] pt-6">
                    <Button
                      icon={<RollbackOutlined />}
                      onClick={() => {
                        setIsEditing(false);
                        form.setFieldsValue({
                          fullName: user.fullName,
                          email: user.email,
                          phoneNumber: user.phoneNumber,
                          address: user.address,
                        });
                      }}
                    >
                      Hủy
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} className="!bg-[var(--color-primary)] !shadow-none">
                      Lưu thay đổi
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm leading-6 text-[var(--color-secondary)]">
                    Hãy giữ cho email, số điện thoại và địa chỉ liên hệ luôn chính xác để bộ phận hỗ trợ có thể liên hệ khi cần.
                  </div>
                )}
              </Form>
            </section>
          </div>
        </Card>

        <Card className="app-surface border-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Địa chỉ giao hàng</div>
              <Title level={3} className="!mb-0 !mt-2 !font-semibold !tracking-tight">Sổ địa chỉ của bạn</Title>
            </div>
            <Button type="primary" icon={<PlusOutlined />} className="!bg-[var(--color-primary)] !shadow-none" onClick={openCreateAddressModal}>
              Thêm địa chỉ mới
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            {addressLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : addresses.length > 0 ? (
              addresses.map((address) => (
                <div key={address.id} className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold tracking-tight text-[var(--color-primary)]">{address.recipientName}</div>
                        <Tag className="!mr-0">{address.recipientPhone}</Tag>
                        {address.isDefault ? <Tag color="green" className="!mr-0">Mặc định</Tag> : null}
                        {address.label ? <Tag color="blue" className="!mr-0">{address.label}</Tag> : null}
                      </div>
                      <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-[var(--color-secondary)]">
                        <EnvironmentOutlined className="mt-1" />
                        <span>{address.addressLine}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!address.isDefault ? (
                        <Button onClick={() => void handleSetDefault(address.id)}>
                          Đặt mặc định
                        </Button>
                      ) : null}
                      <Button onClick={() => openEditAddressModal(address)}>
                        Sửa
                      </Button>
                      <Button danger onClick={() => handleDeleteAddress(address)}>
                        Xóa
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <Empty description="Bạn chưa có địa chỉ giao hàng nào">
                <Button type="primary" icon={<PlusOutlined />} className="!bg-[var(--color-primary)] !shadow-none" onClick={openCreateAddressModal}>
                  Tạo địa chỉ đầu tiên
                </Button>
              </Empty>
            )}
          </div>
        </Card>
      </div>

      <Modal
        title={editingAddress ? 'Cập nhật địa chỉ giao hàng' : 'Thêm địa chỉ giao hàng'}
        open={isAddressModalOpen}
        onCancel={() => setIsAddressModalOpen(false)}
        onOk={() => void handleSaveAddress()}
        okText={editingAddress ? 'Lưu địa chỉ' : 'Thêm địa chỉ'}
        cancelText="Đóng"
        confirmLoading={savingAddress}
        destroyOnClose
      >
        <Form<UserAddressRequest> form={addressForm} layout="vertical" requiredMark={false} className="mt-4">
          <Form.Item label="Nhãn địa chỉ" name="label">
            <Input placeholder="Ví dụ: Nhà riêng, Công ty" />
          </Form.Item>
          <Form.Item label="Người nhận" name="recipientName" rules={[{ required: true, message: 'Vui lòng nhập tên người nhận.' }]}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="recipientPhone" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại.' }]}>
            <Input placeholder="09xxxxxxxx" />
          </Form.Item>
          <Form.Item label="Địa chỉ giao hàng" name="addressLine" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ giao hàng.' }]}>
            <Input.TextArea rows={4} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
          </Form.Item>
          <Form.Item label="Đặt làm địa chỉ mặc định" name="isDefault" valuePropName="checked">
            <Switch checkedChildren="Mặc định" unCheckedChildren="Không" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
