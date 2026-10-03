'use client';
import { useRef, useState } from 'react';
import { App, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { uploadApi, type UploadedAsset } from '@/services/uploadApi';
import { apiErrorMessage } from '@/lib/api-error';
import { freshAccessToken } from '@/lib/axiosClient';
export default function CloudinaryUploadButton({ multiple = false, onUploaded, buttonText = 'Tải ảnh', size = 'middle', disabled = false }: {
  multiple?: boolean; onUploaded: (assets: UploadedAsset[]) => void; buttonText?: string; size?: 'small' | 'middle' | 'large'; disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null), { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const change = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (files.some((file) => !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) || files.reduce((total, file) => total + file.size, 0) >= 50 * 1024 * 1024) {
      message.error('Chọn tệp ảnh tối đa 10 MB mỗi tệp, tổng dung lượng dưới 50 MB.'); event.target.value = ''; return;
    }
    setUploading(true);
    try {
      await freshAccessToken();
      const uploaded = multiple ? await uploadApi.uploadProductGallery(files) : [await uploadApi.uploadProductImage(files[0])];
      onUploaded(uploaded); message.success('Đã tải ảnh.');
    } catch (error) { message.error(apiErrorMessage(error, 'Chưa thể tải ảnh.')); }
    finally { setUploading(false); if (input.current) input.current.value = ''; }
  };
  return <><input ref={input} type="file" accept="image/*" multiple={multiple} hidden onChange={(event) => void change(event)} />
    <Button size={size} icon={<UploadOutlined />} disabled={disabled} loading={uploading} onClick={() => input.current?.click()}>{buttonText}</Button></>;
}
