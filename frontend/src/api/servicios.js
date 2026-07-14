import api from './client';

export const getServicios = (params) => api.get('/servicios', { params }).then(r => r.data);
export const getResumen = () => api.get('/servicios/resumen').then(r => r.data);
export const getServicio = (id) => api.get(`/servicios/${id}`).then(r => r.data);
export const crearServicio = (data) => api.post('/servicios', data).then(r => r.data);
export const actualizarServicio = (id, data) => api.put(`/servicios/${id}`, data).then(r => r.data);
export const eliminarServicio = (id) => api.delete(`/servicios/${id}`);
