import API from "./api";

/* ================= VISITOR API ================= */

export const visitorApi = {
  // Public
  validateQR: (token: string, params: any = {}) =>
    API.get(`visitor/validate/${token}`, { params }),

  submitVisitor: (data: any) =>
    API.post(`visitor/submit`, data),

  // Authenticated
  listVisitors: (filters: any) =>
    API.get(`visitor/list`, { params: filters }),

  getVisitor: (id: number) =>
    API.get(`visitor/${id}`),

  approveVisitor: (id: number) =>
    API.post(`visitor/${id}/approve`),

  rejectVisitor: (id: number) =>
    API.post(`visitor/${id}/reject`),

  checkoutVisitor: (id: number) =>
    API.post(`visitor/${id}/checkout`),

  getVisitorStats: () =>
    API.get(`visitor/stats/summary`),
};

/* ================= QR API ================= */

export const qrApi = {
  generateQR: (days: number) =>
    API.post(`visitor/qr/generate`, { expires_in_days: days }),

  getActiveQR: () =>
    API.get(`visitor/qr/active`),

  revokeQR: (id: number) =>
    API.post(`visitor/qr/${id}/revoke`),

  generateVisitorUrl: (
    token: string,
    schoolCode: string,
    branchId?: string
  ) => {
    let url = `https://yourfrontend.com/visit/${token}?school=${schoolCode}`;
    if (branchId) url += `&branch=${branchId}`;
    return url;
  },
};