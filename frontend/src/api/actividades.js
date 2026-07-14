import api from './client';

export const getActividades   = ()            => api.get('/actividades');
export const crearActividad   = (data)        => api.post('/actividades', data);
export const updateActividad  = (id, data)    => api.put(`/actividades/${id}`, data);
export const deleteActividad  = (id)          => api.delete(`/actividades/${id}`);

export const crearInsumo  = (actId, data)          => api.post(`/actividades/${actId}/insumos`, data);
export const updateInsumo = (actId, insumoId, data) => api.put(`/actividades/${actId}/insumos/${insumoId}`, data);
export const deleteInsumo = (actId, insumoId)       => api.delete(`/actividades/${actId}/insumos/${insumoId}`);
