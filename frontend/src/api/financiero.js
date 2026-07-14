import api from './client';

export const getGastos     = (params) => api.get('/financiero/gastos', { params });
export const createGasto   = (data)   => api.post('/financiero/gastos', data);
export const updateGasto   = (id, data) => api.put(`/financiero/gastos/${id}`, data);
export const deleteGasto   = (id)     => api.delete(`/financiero/gastos/${id}`);

export const getIngresos   = (params) => api.get('/financiero/ingresos', { params });
export const createIngreso = (data)   => api.post('/financiero/ingresos', data);
export const updateIngreso = (id, data) => api.put(`/financiero/ingresos/${id}`, data);
export const deleteIngreso = (id)     => api.delete(`/financiero/ingresos/${id}`);

export const getFacturas   = () => api.get('/financiero/facturas');
export const createFactura = (data) => api.post('/financiero/facturas', data);
export const updateFactura = (id, data) => api.put(`/financiero/facturas/${id}`, data);
export const deleteFactura = (id)   => api.delete(`/financiero/facturas/${id}`);

export const getResumen    = (params) => api.get('/financiero/resumen', { params });
