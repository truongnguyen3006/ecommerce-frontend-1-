"use client";

import { useRef, useState } from 'react';
import { Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { uploadApi, type UploadedAsset } from '@/services/uploadApi';

interface CloudinaryUploadButtonProps {
  multiple?: boolean;
  onUploaded: (assets: UploadedAsset[]) => void;
  buttonText?: string;
  className?: string;
  size?: 'small' | 'middle' | 'large';
}

export default function CloudinaryUploadButton({
  multiple = false,
  onUploaded,
  buttonText = 'Upload',
  className,
  size = 'middle',
}: CloudinaryUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleOpen = () => inputRef.current?.click();

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const uploaded = multiple
        ? await uploadApi.uploadProductGallery(files)
        : [await uploadApi.uploadProductImage(files[0])];
      onUploaded(uploaded);
      message.success(multiple ? 'Đã upload ảnh lên Cloudinary' : 'Đã upload ảnh lên Cloudinary');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || 'Upload ảnh thất bại';
      message.error(errorMessage);
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={handleChange}
      />
      <Button
        icon={<UploadOutlined />}
        loading={uploading}
        onClick={handleOpen}
        className={className}
        size={size}
      >
        {buttonText}
      </Button>
    </>
  );
}
