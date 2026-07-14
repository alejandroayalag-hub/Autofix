import api from './client';

export const getAutos = () => api.get('/autos');
export const getAuto = (id) => api.get(`/autos/${id}`);

export const createAuto = (formData) =>
  api.post('/autos', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const updateAuto = (id, formData) =>
  api.put(`/autos/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deleteAuto = (id) => api.delete(`/autos/${id}`);
