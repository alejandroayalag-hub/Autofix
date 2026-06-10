import api from './client';

export const getGastos   = (id)           => api.get(`/ordenes/${id}/gastos`);
export const addGasto    = (id, data)     => api.post(`/ordenes/${id}/gastos`, data);
export const deleteGasto = (id, gastoId)  => api.delete(`/ordenes/${id}/gastos/${gastoId}`);
