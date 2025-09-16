// src/app/api/axios-instance.ts
// 🟢 این فقط یک «پل موقت» است تا ایمپورت‌های قدیمی نشکنند.
// 🟢 پشت‌صحنه، همان http جدید (با کوکی HttpOnly و BASE_URL صحیح) را برمی‌گرداند.

import http from "@/lib/api/http";
export default http;
export { http };
