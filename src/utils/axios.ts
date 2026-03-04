import axios, { AxiosRequestConfig } from 'axios';
// config
import { HOST_API } from 'src/config-global';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: HOST_API });

// REQUEST INTERCEPTOR (AUTO TOKEN)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['x-access-token'] = token;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR — handles 401 TOKEN_EXPIRED globally
let _sessionExpiredHandled = false;

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    // 🔥 Auto-Logout when system session token expires
    if (status === 401 && code === 'TOKEN_EXPIRED' && !_sessionExpiredHandled) {
      _sessionExpiredHandled = true;
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setTimeout(() => {
        _sessionExpiredHandled = false;
        // Fire a custom DOM event — App.tsx can listen and show a snackbar
        window.dispatchEvent(new CustomEvent('session:expired', {
          detail: { message: 'Your session has expired. Please login again.' }
        }));
        window.location.href = '/auth/jwt/login?reason=session_expired';
      }, 300);
    }

    return Promise.reject(
      (error.response && error.response.data) || 'Something went wrong'
    );
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await axiosInstance.get(url, { ...config });

  return res.data;
};

// ----------------------------------------------------------------------

export const endpoints = {
  chat: '/api/chat',
  kanban: '/api/kanban',
  calendar: '/api/calendar',
  auth: {
    me: '/api/auth/me',
    login: '/api/auth/login',
    register: '/api/auth/register',
    adminLogout: '/api/admin/logout',
    userLogout: '/api/user/logout',
  },
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
  },
  post: {
    list: '/api/post/list',
    details: '/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
  product: {
    list: '/api/product/list',
    details: '/api/product/details',
    search: '/api/product/search',
  },
  orders: {
    brokerResponses: '/api/orders/broker-responses',
  },
};
