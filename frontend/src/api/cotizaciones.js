import api from './client';

export const getCotizaciones   = () => api.get('/cotizaciones');
export const getCotizacion     = (id) => api.get(`/cotizaciones/${id}`);
export const createCotizacion  = (data) => api.post('/cotizaciones', data);
export const updateCotizacion  = (id, data) => api.put(`/cotizaciones/${id}`, data);
export const deleteCotizacion  = (id) => api.delete(`/cotizaciones/${id}`);
export const convertirCotizacion = (id) => api.post(`/cotizaciones/${id}/convertir`);
