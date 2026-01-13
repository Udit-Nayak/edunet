import axios, { Axios } from 'axios';
const API= axios.create({
    baseURL:'http://localhost:5000/api',
    withCredentials:true,
})

API.interceptors.request.use((config)=>{
    const token=localStorage.getItem('token');
    if(token){
        config.headers.Authorization=`Bearer ${token}`;
    }
    return config;
})

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  googleAuth: (firebaseToken) => API.post('/auth/google', { firebaseToken }),
  getMe: () => API.get('/auth/me'),
  logout: () => API.post('/auth/logout'),
  updateProfile: (data) => API.put('/auth/profile', data),
  updateUsername: (username) => API.put('/auth/username', { username }),
};

export default API;
