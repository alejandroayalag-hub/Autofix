import api from './client';

export const getClientes       = ()         => api.get('/clientes').then(r => r.data);
export const crearCliente      = (fd)       => api.post('/clientes', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
export const actualizarCliente = (id, fd)   => api.put(`/clientes/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
export const eliminarCliente   = (id)       => api.delete(`/clientes/${id}`);
