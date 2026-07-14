import api from './client';

export const getRemision   = (ordenId)             => api.get(`/ordenes/${ordenId}/remision`);
export const crearRemision = (ordenId, formaPago)  => api.post(`/ordenes/${ordenId}/remision`, { forma_pago: formaPago });
export const pagarRemision = (ordenId)             => api.put(`/ordenes/${ordenId}/remision/pagar`);
