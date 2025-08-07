import axios from 'axios';
const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
});

axiosInstance.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status, response.data);
    if (response.data && response.data.success) {
      return response.data;
    } else {
      console.error('Response validation failed:', response.data);
      throw new Error(response.data?.message || '服务器端错误');
    }
  },
  (error) => {
    console.error('Request error:', error.message);
    console.error('Error details:', error.response?.data);
    throw error;
  }
);
export default axiosInstance;
