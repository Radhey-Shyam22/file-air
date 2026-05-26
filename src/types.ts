export interface FileTransfer {
  key: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  expiresAt: string;
  singleUse: boolean;
  downloadCount: number;
}

export interface UploadResponse {
  success: boolean;
  key: string;
  expiresAt: string;
  file: FileTransfer;
}

export interface FileInfoResponse {
  success: boolean;
  file?: FileTransfer;
  error?: string;
}

export interface SystemStats {
  activeTransfers: number;
  totalTransports: number;
  totalBytesShared: number;
}
