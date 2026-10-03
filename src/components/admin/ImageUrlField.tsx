'use client';
import { Input } from 'antd';
import CloudinaryUploadButton from '@/components/admin/CloudinaryUploadButton';
export default function ImageUrlField({ value, onChange, disabled, id }: { value?: string; onChange?: (value: string) => void; disabled?: boolean; id?: string }) {
  return <div className="editor-upload"><Input id={id} value={value} maxLength={255} disabled={disabled} onChange={(event) => onChange?.(event.target.value)} placeholder="https://…" />
    <CloudinaryUploadButton disabled={disabled} onUploaded={(assets) => { if (assets[0]?.secureUrl) onChange?.(assets[0].secureUrl); }} />
  </div>;
}
