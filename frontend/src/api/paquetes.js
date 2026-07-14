import api from './client';

export const getPaquetes   = (soloActivos = false) => api.get('/paquetes' + (soloActivos ? '?activos=1' : ''));
export const createPaquete = (data) => api.post('/paquetes', data);
export const updatePaquete = (id, data) => api.put(`/paquetes/${id}`, data);
export const deletePaquete = (id) => api.delete(`/paquetes/${id}`);
