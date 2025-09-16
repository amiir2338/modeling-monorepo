import http from "./http";


export type Role = "client" | "model" | "admin";

export const api = {
  auth: {
    async register(email: string, password: string, name?: string, role: Role = "client") {
      const res = await http.post("/api/v1/auth/register", { email, password, name, role });
      return res.data; // { ok, data: { user } }
    },
    async login(email: string, password: string) {
      // پس از لاگین، بدنه token لازم نیست؛ کوکی ست می‌شود
      const res = await http.post("/api/v1/auth/login", { email, password });
      if (res.status !== 200) throw new Error(res.data?.message || "Login failed");
      // بلافاصله کاربر را از /me بگیر
      const me = await http.get("/api/v1/auth/me");
      return me.data; // { ok, data: { user } }
    },
    async me() {
      const res = await http.get("/api/v1/auth/me");
      return res.data;
    },
    async logout() {
      const res = await http.post("/api/v1/auth/logout", {});
      return res.data;
    },
  },
};

