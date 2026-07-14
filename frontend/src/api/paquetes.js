import api from './client';

export const getPaquetes   = (soloActivos = false) => api.get('/paquetes' + (soloActivos ? '?activos=1' : ''));
export const createPaquete = (data) => api.post('/paquetes', data);
export const updatePaquete = (id, data) => api.put(`/paquetes/${id}`, data);
export const deletePaquete = (id) => api.delete(`/paquetes/${id}`);

export const getPaquetesCompuestos  = ()          => api.get('/paquetes/compuestos');
export const getPaqueteArbol        = (id)        => api.get(`/paquetes/${id}/arbol`);
export const crearPaqueteCompuesto  = (data)      => api.post('/paquetes/compuestos', data);
export const setPaqueteActividades  = (id, ids)   => api.put(`/paquetes/${id}/actividades`, { actividades: ids });
