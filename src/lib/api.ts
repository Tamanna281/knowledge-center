import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    withCredentials: true, // Important for cookies
})

export const chatApi = {
    sendMessage: async (question: string) => {
        const response = await api.post('/chat', { question });
        return response.data;
    },
    importData: async (formData: FormData) => {
        const response = await api.post('/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    importNesscoData: async (formData: FormData) => {
        const response = await api.post('/import/nessco', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
}

export default api
