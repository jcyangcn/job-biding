import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

const axiosInt = axios.create();

axiosInt.interceptors.response.use(
  (response) => response,
  (error) =>
    Promise.reject(
      (error.response && error.response.data) || 'There is an error!'
    )
);

// Only attach mocks in development. In production the adapter would reject
// unmatched requests and break any page that still uses this axios instance.
export const mock =
  process.env.NODE_ENV !== 'production'
    ? new AxiosMockAdapter(axiosInt, {
        delayResponse: 0,
        onNoMatch: 'passthrough'
      })
    : null;

export default axiosInt;
