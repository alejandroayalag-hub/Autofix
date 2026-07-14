import api from './client';

export const getCatalogo       = ()         => api.get('/catalogo').then(r => r.data);
export const getCatalogoTipo   = (tipo)     => api.get(`/catalogo/${tipo}`).then(r => r.data);
export const crearItem         = (data)     => api.post('/catalogo', data).then(r => r.data);
export const actualizarItem    = (id, data) => api.put(`/catalogo/${id}`, data).then(r => r.data);
export const eliminarItem      = (id)       => api.delete(`/catalogo/${id}`);
