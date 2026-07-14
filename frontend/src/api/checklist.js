import api from './client';

export const getChecklist    = (id)               => api.get(`/ordenes/${id}/checklist`);
export const addChecklistItem = (id, desc)        => api.post(`/ordenes/${id}/checklist`, { descripcion: desc });
export const toggleChecklistItem = (id, itemId, hecho) => api.put(`/ordenes/${id}/checklist/${itemId}`, { hecho });
export const deleteChecklistItem = (id, itemId)   => api.delete(`/ordenes/${id}/checklist/${itemId}`);
