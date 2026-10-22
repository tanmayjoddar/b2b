import {
  AuthResponse,
  AuthUser,
  LoginPasswordDto,
  RegisterBrandDto,
  RequestOtpDto,
  VerifyOtpDto,
  CreateBriefDto,
  CreateShortlistDto,
  SubmitQuoteDto,
  QuoteDecisionDto,
  CreateFactoryProfileDto,
  AddCapabilityDto,
  SubmitCertificateDto,
  AdminVerifyFactoryDto,
  CreateOrderDto,
  TransitionOrderDto,
  CreateSampleDto,
  TransitionSampleDto,
  CreatePaymentDto,
  VerifyPaymentSignatureDto,
} from '@factorymatch/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('fm_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends httpOnly cookies
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = resJson.error || {};
    throw new ApiError(
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unexpected error occurred',
      response.status,
      error.details,
    );
  }

  return resJson.data as T;
}

export const api = {
  // ── Auth ──
  async loginWithPassword(dto: LoginPasswordDto): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/login/password', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    if (typeof window !== 'undefined' && res.accessToken) {
      localStorage.setItem('fm_token', res.accessToken);
      localStorage.setItem('fm_user', JSON.stringify(res.user));
    }
    return res;
  },

  async registerBrand(dto: RegisterBrandDto): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/register/brand', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    if (typeof window !== 'undefined' && res.accessToken) {
      localStorage.setItem('fm_token', res.accessToken);
      localStorage.setItem('fm_user', JSON.stringify(res.user));
    }
    return res;
  },

  async requestOtp(dto: RequestOtpDto): Promise<{ message: string; debugOtp?: string }> {
    return request<{ message: string; debugOtp?: string }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    if (typeof window !== 'undefined' && res.accessToken) {
      localStorage.setItem('fm_token', res.accessToken);
      localStorage.setItem('fm_user', JSON.stringify(res.user));
    }
    return res;
  },

  async getMe(): Promise<AuthUser> {
    return request<AuthUser>('/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fm_token');
        localStorage.removeItem('fm_user');
      }
    }
  },

  // ── Briefs ──
  async createBrief(dto: CreateBriefDto) {
    return request<any>('/briefs', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async listBriefs() {
    return request<any[]>('/briefs');
  },

  async getBrief(id: string) {
    return request<any>(`/briefs/${id}`);
  },

  async submitBrief(id: string) {
    return request<any>(`/briefs/${id}/submit`, { method: 'POST' });
  },

  async cancelBrief(id: string) {
    return request<any>(`/briefs/${id}/cancel`, { method: 'POST' });
  },

  // ── Matching / Shortlist ──
  async getShortlist(briefId: string) {
    return request<any>(`/briefs/${briefId}/shortlist`);
  },

  async createShortlist(briefId: string, dto: CreateShortlistDto) {
    return request<any>(`/admin/briefs/${briefId}/shortlist`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // ── Quotes ──
  async getQuotesForBrief(briefId: string) {
    return request<{ briefId: string; briefProductName: string; quotes: any[] }>(
      `/briefs/${briefId}/quotes`,
    );
  },

  async submitQuote(dto: SubmitQuoteDto) {
    return request<any>('/quotes', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async decideQuote(quoteId: string, dto: QuoteDecisionDto) {
    return request<any>(`/quotes/${quoteId}/decide`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getMyQuoteRequests() {
    return request<any[]>('/quote-requests/my');
  },

  async createQuoteRequest(briefId: string, factoryId: string, expiresAt: string) {
    return request<any>(`/admin/briefs/${briefId}/quote-requests`, {
      method: 'POST',
      body: JSON.stringify({ briefId, factoryId, expiresAt }),
    });
  },

  // ── Factories ──
  async createFactoryProfile(dto: CreateFactoryProfileDto) {
    return request<any>('/factories', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async listFactories() {
    return request<any[]>('/factories');
  },

  async getFactory(id: string) {
    return request<any>(`/factories/${id}`);
  },

  async addCapability(factoryId: string, dto: AddCapabilityDto) {
    return request<any>(`/factories/${factoryId}/capabilities`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async submitCertificate(factoryId: string, dto: SubmitCertificateDto) {
    return request<any>(`/factories/${factoryId}/certificates`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // ── Verification (Admin) ──
  async verifyFactory(factoryId: string, dto: AdminVerifyFactoryDto) {
    return request<any>(`/admin/factories/${factoryId}/verify`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getVerifications(factoryId: string) {
    return request<any[]>(`/admin/factories/${factoryId}/verifications`);
  },

  // ── Orders ──
  async createOrder(dto: CreateOrderDto) {
    return request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async listOrders() {
    return request<any[]>('/orders');
  },

  async getOrder(id: string) {
    return request<any>(`/orders/${id}`);
  },

  async transitionOrder(id: string, toStatus: string, reason?: string) {
    return request<any>(`/orders/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ toStatus, reason }),
    });
  },

  async getOrderEvents(id: string) {
    return request<any[]>(`/orders/${id}/events`);
  },

  // ── Samples ──
  async createSample(dto: CreateSampleDto) {
    return request<any>('/samples', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async listSamples() {
    return request<any[]>('/samples');
  },

  async getSample(id: string) {
    return request<any>(`/samples/${id}`);
  },

  async transitionSample(id: string, dto: TransitionSampleDto) {
    return request<any>(`/samples/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // ── Payments ──
  async createPayment(dto: CreatePaymentDto) {
    return request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async verifyPayment(dto: VerifyPaymentSignatureDto) {
    return request<any>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getPaymentsForOrder(orderId: string) {
    return request<any[]>(`/orders/${orderId}/payments`);
  },
};
