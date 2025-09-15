// lib/api.js
import axios from 'axios';

// O endereço base do nosso backend. Quando rodando localmente, será este.
const API_URL = 'http://127.0.0.1:8000/api/';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Esta parte é a "mágica": antes de cada requisição, ele verifica se temos um "crachá" (token)
// guardado e o adiciona no cabeçalho, provando que estamos autenticados.
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;