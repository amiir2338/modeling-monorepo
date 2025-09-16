export type UserRole = 'admin' | 'client' | 'model';

export interface UserDTO {
  _id: string;
  email: string;
  role: UserRole;
  name: string | null;
  avatar?: string | null;
}

export interface JobDTO {
  _id: string;
  clientId: string;
  title: string;
  description?: string | null;
  budget?: number | null;
  city?: string | null;
  date?: string | null;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiOk<T> { ok: true; data: T }
export interface ApiOkPaginated<T> { ok: true; data: T[]; page: number; limit: number; total: number }
export interface ApiErr { ok: false; message: string }

export type ApiResult<T> = ApiOk<T> | ApiErr;
export type Paginated<T> = ApiOkPaginated<T> | ApiErr;

