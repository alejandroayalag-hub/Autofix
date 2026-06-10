import api from './client';

// CRUD órdenes
export const getOrdenes = (params) => api.get('/ordenes', { params });
export const getOrden = (id) => api.get(`/ordenes/${id}`);
export const createOrden = (data) => api.post('/ordenes', data);
export const updateOrden = (id, data) => api.put(`/ordenes/${id}`, data);
export const updateOrdenEstatus = (id, estatus) => api.put(`/ordenes/${id}/estatus`, { estatus });
export const deleteOrden = (id) => api.delete(`/ordenes/${id}`);

// Diagnóstico general
export const getDiagnostico = (id) => api.get(`/ordenes/${id}/diagnostico`);
export const saveDiagnostico = (id, data) => api.post(`/ordenes/${id}/diagnostico`, data);

// Diagnóstico de frenos
export const getDiagnosticoFremos = (id) => api.get(`/ordenes/${id}/frenos`).then(r => r.data);
export const saveDiagnosticoFremos = (id, data) => api.post(`/ordenes/${id}/frenos`, data).then(r => r.data);

// Cotización de OT
export const generarCotizacion = (id) => api.post(`/ordenes/${id}/cotizacion`);
export const enviarCotizacion = (id) => api.post(`/ordenes/${id}/cotizacion/enviar`);

// Cotización pública (sin auth, usa fetch nativo o axios sin token)
export const getCotizacionPublica = (token) => api.get(`/c/${token}`);
export const aprobarCotizacion = (token) => api.post(`/c/${token}/aprobar`);
export const rechazarCotizacion = (token, motivo) => api.post(`/c/${token}/rechazar`, { motivo });

export const getPipeline          = ()          => api.get('/ordenes', { params: { pipeline: 1 } });
export const updateOrdenTipoFlujo = (id, tipo)  => api.put(`/ordenes/${id}`, { tipo_flujo: tipo });
