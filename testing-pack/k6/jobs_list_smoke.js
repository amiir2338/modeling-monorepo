import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
};

const API = __ENV.API_BASE_URL || 'http://localhost:4000/api';

export default function () {
  const res = http.get(`${API}/jobs`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
