import api from './client';

export const getProgresos   = (id)          => api.get(`/ordenes/${id}/progresos`);
export const addProgreso    = (id, desc)    => api.post(`/ordenes/${id}/progresos`, { descripcion: desc });
export const deleteProgreso = (id, progId)  => api.delete(`/ordenes/${id}/progresos/${progId}`);
