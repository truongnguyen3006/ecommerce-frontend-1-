import axiosClient from '@/lib/axiosClient';

export interface UploadedAsset {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  originalFilename?: string;
}

export const uploadApi = {
  uploadProductImage: async (file: File): Promise<UploadedAsset> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post<UploadedAsset, UploadedAsset>('/api/product/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadProductGallery: async (files: File[]): Promise<UploadedAsset[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return axiosClient.post<UploadedAsset[], UploadedAsset[]>('/api/product/uploads/gallery', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
