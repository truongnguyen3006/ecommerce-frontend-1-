'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Form, Input, InputNumber, Modal, Select, Switch, Table } from 'antd';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import type { Product, CreateProductRequest, CreateVariantRequest } from '@/types';
import { productApi } from '@/services/productApi';
import { inventoryApi } from '@/services/inventoryApi';
import { apiErrorMessage } from '@/lib/api-error';
import { freshAccessToken } from '@/lib/axiosClient';
import { formatMoney } from '@/lib/format';
import { validateVariants, skuPart } from '@/lib/product-editor';
import ProductImage from '@/components/ui/ProductImage';
import ImageUrlField from '@/components/admin/ImageUrlField';
import CloudinaryUploadButton from '@/components/admin/CloudinaryUploadButton';

type VariantDraft = CreateVariantRequest;
function GalleryFields() {
  return <Form.List name="galleryImages">{(fields, { add, remove }) => <section className="mt-6"><h3>Ảnh chi tiết</h3>
    {fields.map((field) => <div key={field.key} className="flex items-start gap-2 mt-3">
      <Form.Item name={field.name} className="flex-1" rules={[{ max: 255, message: 'URL tối đa 255 ký tự.' }]}><ImageUrlField /></Form.Item>
      <Button aria-label={`Xóa ảnh ${field.name + 1}`} onClick={() => remove(field.name)}>Xóa</Button>
    </div>)}<div className="flex gap-3 flex-wrap mt-3"><Button disabled={fields.length >= 30} onClick={() => add('')}>Thêm URL ảnh</Button>
      <CloudinaryUploadButton multiple onUploaded={(assets) => {
        assets.slice(0, 30 - fields.length).forEach((asset) => add(asset.secureUrl));
      }} />
    </div></section>}</Form.List>;
}
function VariantDialog({ variant, existing, price, saving, onSave, onClose }: {
  variant?: VariantDraft; existing: boolean; price: number; saving: boolean; onSave: (value: VariantDraft) => Promise<void>; onClose: () => void;
}) {
  const [form] = Form.useForm<VariantDraft>();
  const { message } = App.useApp();
  return <Modal open title={existing ? 'Sửa biến thể' : 'Thêm biến thể'} width={640} onCancel={onClose} onOk={() => form.submit()} confirmLoading={saving} okText="Lưu biến thể" cancelText="Hủy">
    <Form<VariantDraft> form={form} layout="vertical" disabled={saving} requiredMark={false} initialValues={variant || { price, initialQuantity: 0, isActive: true, galleryImages: [] }} onFinish={async (values) => {
      try { await onSave({ ...values, initialQuantity: values.initialQuantity ?? 0, galleryImages: (values.galleryImages || []).map((url) => url.trim()).filter(Boolean) }); }
      catch (error) { message.error(apiErrorMessage(error)); }
    }} className="mt-6">
      <Form.Item label="Mã SKU" name="skuCode" rules={[{ required: true, whitespace: true, message: 'Nhập mã SKU.' }]}><Input disabled={existing} maxLength={255} /></Form.Item>
      {existing && <p className="text-sm muted mb-6">Mã SKU được giữ nguyên để liên kết với tồn kho và lịch sử đơn.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4"><Form.Item label="Màu sắc" name="color"><Input maxLength={255} /></Form.Item><Form.Item label="Kích cỡ" name="size"><Input maxLength={255} /></Form.Item></div>
      <Form.Item label="Giá bán (đ)" name="price" rules={[{ required: true, message: 'Nhập giá bán.' }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
      {!existing && <Form.Item label="Số lượng khởi tạo" name="initialQuantity" rules={[{ required: true, message: 'Nhập số lượng.' }]}><InputNumber min={0} precision={0} max={2147483647} style={{ width: '100%' }} /></Form.Item>}
      <Form.Item label="Ảnh đại diện" name="imageUrl"><ImageUrlField /></Form.Item>
      <Form.Item label="Đang bán" name="isActive" valuePropName="checked"><Switch aria-label="Đang bán" /></Form.Item><GalleryFields />
    </Form>
  </Modal>;
}
interface BulkValues { model: string; color: string; sizes: string[]; price: number; initialQuantity: number; imageUrl: string; galleryImages?: string[] }
function BulkDialog({ price, saving, onSave, onClose }: { price: number; saving: boolean; onSave: (variants: VariantDraft[]) => Promise<void>; onClose: () => void }) {
  const [form] = Form.useForm<BulkValues>();
  const { message } = App.useApp();
  return <Modal open title="Thêm nhiều kích cỡ" onCancel={onClose} onOk={() => form.submit()} okText="Thêm biến thể" cancelText="Hủy" confirmLoading={saving}>
    <Form<BulkValues> form={form} layout="vertical" disabled={saving} requiredMark={false} initialValues={{ price, initialQuantity: 0 }} className="mt-6" onFinish={async (values) => {
      const model = skuPart(values.model), color = skuPart(values.color);
      if (!model || !color || values.sizes.some((size) => !skuPart(size))) { message.error('Mã dòng, màu và kích cỡ cần có chữ hoặc số.'); return; }
      try {
        await onSave(values.sizes.map((size) => ({ skuCode: `${model}-${color}-${skuPart(size)}`, color: values.color.trim(), size: size.trim(), price: values.price, initialQuantity: values.initialQuantity, imageUrl: values.imageUrl || '', galleryImages: (values.galleryImages || []).map((url) => url.trim()).filter(Boolean), isActive: true })));
      } catch (error) { message.error(apiErrorMessage(error)); }
    }}>
      <Form.Item label="Mã dòng sản phẩm" name="model" rules={[{ required: true, whitespace: true, message: 'Nhập mã dòng.' }]}><Input maxLength={100} placeholder="VD: FLASH01" /></Form.Item>
      <Form.Item label="Tên màu" name="color" rules={[{ required: true, whitespace: true, message: 'Nhập tên màu.' }]}><Input maxLength={100} /></Form.Item>
      <Form.Item label="Các kích cỡ" name="sizes" rules={[{ required: true, type: 'array', min: 1, message: 'Chọn ít nhất một kích cỡ.' }]}><Select mode="tags" tokenSeparators={[',']} placeholder="Nhập từng kích cỡ" /></Form.Item>
      <Form.Item label="Giá bán (đ)" name="price" rules={[{ required: true, message: 'Nhập giá bán.' }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
      <Form.Item label="Số lượng khởi tạo / SKU" name="initialQuantity" rules={[{ required: true, message: 'Nhập số lượng.' }]}><InputNumber min={0} precision={0} max={2147483647} style={{ width: '100%' }} /></Form.Item>
      <Form.Item label="Ảnh đại diện" name="imageUrl"><ImageUrlField /></Form.Item>
      <GalleryFields />
    </Form>
  </Modal>;
}
export default function ProductEditor({ product }: { product?: Product }) {
  const router = useRouter(), queryClient = useQueryClient(), { message, modal } = App.useApp();
  const [form] = Form.useForm<CreateProductRequest>();
  const [draftVariants, setDraftVariants] = useState<VariantDraft[]>([]);
  const [variantEditor, setVariantEditor] = useState<VariantDraft | 'new' | null>(null), [bulkOpen, setBulkOpen] = useState(false);
  const [adjustSku, setAdjustSku] = useState<string | null>(null), [adjustment, setAdjustment] = useState<number | null>(null);
  const [variantSaving, setVariantSaving] = useState(false);
  const variants: VariantDraft[] = product ? product.variants.map((variant) => ({ ...variant, imageUrl: variant.imageUrl || '', galleryImages: variant.galleryImages || [], price: variant.price ?? product.price, initialQuantity: 0, isActive: variant.isActive !== false })) : draftVariants;
  const watchedName = Form.useWatch('name', form) as string | undefined;
  const watchedImage = Form.useWatch('imageUrl', form) as string | undefined;
  const watchedPrice = Form.useWatch('basePrice', form) as number | undefined;
  const stocks = useQueries({ queries: product ? variants.map((variant) => ({ queryKey: ['stock', variant.skuCode], queryFn: () => inventoryApi.getStock(variant.skuCode), staleTime: 0 })) : [] });
  const invalidate = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['catalog'] }), queryClient.invalidateQueries({ queryKey: ['products'] }), queryClient.invalidateQueries({ queryKey: ['product'] }), queryClient.invalidateQueries({ queryKey: ['sku'] })]);
  };
  const persistVariants = async (next: VariantDraft[]) => {
    const error = validateVariants(next);
    if (error) { message.error(error); throw new Error('Invalid variants'); }
    if (!product) { setDraftVariants(next); return; }
    setVariantSaving(true);
    try { await freshAccessToken(); await productApi.update(product.id, { variants: next }); await invalidate(); }
    finally { setVariantSaving(false); }
  };
  const saveGeneral = useMutation({
    mutationFn: async (values: CreateProductRequest) => {
      await freshAccessToken();
      if (product) return productApi.update(product.id, values);
      if (!variants.length) throw new Error('Missing variants');
      const error = validateVariants(variants);
      if (error) throw new Error(error);
      return productApi.create({ ...values, imageUrl: values.imageUrl || variants[0]?.imageUrl || '', description: values.description || '', category: values.category || '', variants });
    },
    onSuccess: async () => { message.success('Đã lưu sản phẩm.'); await invalidate(); if (!product) router.push('/admin/products'); },
    onError: (error) => { message.error(!product && !variants.length ? 'Thêm ít nhất một biến thể trước khi lưu.' : apiErrorMessage(error)); },
  });
  const adjust = useMutation({
    mutationFn: async () => { await freshAccessToken(); return inventoryApi.adjust(adjustSku!, adjustment!); },
    onSuccess: () => { message.info('Đã gửi điều chỉnh kho. Kiểm tra lại tồn kho sau khi hệ thống xử lý.'); setAdjustSku(null); setAdjustment(null); void queryClient.invalidateQueries({ queryKey: ['stock'] }); },
    onError: (error) => message.error(apiErrorMessage(error)),
  });
  const variantExists = variantEditor !== null && variantEditor !== 'new';
  return <div><div className="page-heading"><div><Link href="/admin/products" className="text-link text-sm">Danh sách sản phẩm</Link><h1 className="mt-4">{product ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm'}</h1></div></div>
    <div className="editor-grid"><section>
      <Form<CreateProductRequest> form={form} layout="vertical" requiredMark={false} initialValues={product ? { ...product, basePrice: product.price } : { basePrice: 0 }}
        disabled={saveGeneral.isPending || variantSaving} onFinish={(values) => saveGeneral.mutate(values)}>
        <Form.Item label="Tên sản phẩm" name="name" rules={[{ required: true, whitespace: true, message: 'Nhập tên sản phẩm.' }]}><Input maxLength={255} /></Form.Item>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4"><Form.Item label="Danh mục" name="category"><Input maxLength={255} /></Form.Item>
          <Form.Item label="Giá niêm yết (đ)" name="basePrice" rules={[{ required: true, message: 'Nhập giá niêm yết.' }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></div>
        <Form.Item label="Mô tả" name="description"><Input.TextArea rows={3} maxLength={255} showCount /></Form.Item>
        <Form.Item label="Ảnh đại diện sản phẩm" name="imageUrl"><ImageUrlField /></Form.Item>
        <div className="editor-actions"><Link href="/admin/products" className="app-secondary-btn">Quay lại</Link><Button type="primary" htmlType="submit" loading={saveGeneral.isPending}>{product ? 'Lưu thông tin chung' : 'Lưu sản phẩm'}</Button></div>
      </Form>
      <section className="mt-8"><div className="section-header flex-wrap"><h2>Biến thể ({variants.length})</h2><div className="flex gap-3 flex-wrap"><Button disabled={variantSaving} onClick={() => setVariantEditor('new')}>Thêm biến thể</Button><Button disabled={variantSaving} onClick={() => setBulkOpen(true)}>Thêm nhiều kích cỡ</Button>
        {product && <Button onClick={() => void queryClient.invalidateQueries({ queryKey: ['stock'] })}>Kiểm tra lại kho</Button>}</div></div>
        <div className="table-wrap"><Table<VariantDraft> dataSource={variants} rowKey="skuCode" pagination={{ pageSize: 8 }} scroll={{ x: 880 }} loading={variantSaving} locale={{ emptyText: 'Chưa có biến thể' }} columns={[
          { title: 'SKU / Biến thể', width: 220, render: (_, variant) => <div><strong>{variant.skuCode}</strong><p className="muted text-sm">{variant.color} / {variant.size}</p></div> },
          { title: 'Giá', dataIndex: 'price', render: (price: number) => formatMoney(price) },
          { title: product ? 'Tồn khả dụng' : 'Số lượng khởi tạo', render: (_, variant, index) => product ? stocks[index]?.isError ? 'Chưa kiểm tra được' : stocks[index]?.data?.quantity ?? 'Đang tải…' : variant.initialQuantity },
          { title: 'Đang bán', width: 120, render: (_, variant) => <Switch aria-label={`Đang bán ${variant.skuCode}`} checked={variant.isActive} disabled={variantSaving} onChange={(isActive) => {
            void persistVariants(variants.map((item) => item.skuCode === variant.skuCode ? { ...item, isActive } : item)).catch((error) => message.error(apiErrorMessage(error)));
          }} /> },
          { title: 'Thao tác', width: 250, render: (_, variant) => <div className="flex gap-2 flex-wrap">
            <Button aria-label={`Sửa ${variant.skuCode}`} onClick={() => setVariantEditor(variant)}>Sửa</Button>
            {product && <Button onClick={() => { setAdjustSku(variant.skuCode); setAdjustment(null); }}>Điều chỉnh kho</Button>}
            <Button onClick={() => modal.confirm({ title: 'Xóa biến thể?', content: `SKU ${variant.skuCode} sẽ bị loại khỏi sản phẩm.`, okText: 'Xóa', cancelText: 'Hủy', onOk: async () => {
              try { await persistVariants(variants.filter((item) => item.skuCode !== variant.skuCode)); } catch (error) { message.error(apiErrorMessage(error)); throw error; }
            } })}>Xóa</Button>
          </div> },
        ]} /></div>
      </section>
    </section><aside className="editor-preview"><div className="product-media"><ProductImage src={watchedImage || product?.imageUrl} alt={watchedName || 'Ảnh sản phẩm'} sizes="260px" /></div><h2>{watchedName || 'Tên sản phẩm'}</h2><p className="mt-3">{formatMoney(watchedPrice ?? product?.price ?? 0)}</p><p className="text-sm muted mt-3">Xem trước thông tin đang nhập.</p></aside></div>
    {variantEditor && <VariantDialog variant={variantEditor === 'new' ? undefined : variantEditor} existing={variantExists} price={watchedPrice ?? product?.price ?? 0} saving={variantSaving} onClose={() => setVariantEditor(null)} onSave={async (variant) => {
      const next = variantExists ? variants.map((item) => item.skuCode === (variantEditor as VariantDraft).skuCode ? variant : item) : [...variants, variant];
      await persistVariants(next); setVariantEditor(null);
    }} />}
    {bulkOpen && <BulkDialog price={watchedPrice ?? product?.price ?? 0} saving={variantSaving} onClose={() => setBulkOpen(false)} onSave={async (newVariants) => { await persistVariants([...variants, ...newVariants]); setBulkOpen(false); }} />}
    <Modal title={`Điều chỉnh kho: ${adjustSku || ''}`} open={Boolean(adjustSku)} onCancel={() => setAdjustSku(null)} onOk={() => adjust.mutate()} confirmLoading={adjust.isPending} okText="Gửi điều chỉnh" cancelText="Hủy" okButtonProps={{ disabled: !adjustment || !Number.isSafeInteger(adjustment) }}>
      <label className="field mt-6">Số lượng cộng hoặc trừ<InputNumber aria-label="Số lượng điều chỉnh" value={adjustment} onChange={setAdjustment} precision={0} min={-2147483647} max={2147483647} style={{ width: '100%' }} /></label><p className="text-sm muted mt-4">Điều chỉnh được xử lý bất đồng bộ. Tồn kho hiện tại chỉ đổi sau khi hệ thống xử lý xong.</p>
    </Modal>
  </div>;
}
