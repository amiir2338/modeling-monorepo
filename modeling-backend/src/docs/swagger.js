// src/docs/swagger.js
// 🟢 مستندات OpenAPI 3.1 هماهنگ با مسیرهای /api/v1/...

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Modeling Backend API",
    description:
      "مستندات رسمی API بک‌اند مدلینگ: Auth, Models, Clients, Jobs.\n\n" +
      "نکته: احراز هویت در عمل با کوکی HttpOnly انجام می‌شود، اما برای تست دستی در Swagger از Bearer JWT هم پشتیبانی شده.",
    version: "1.0.0",
  },
  servers: [
    { url: "http://localhost:4000/api", description: "Local API root" },
    { url: "http://localhost:4000/api/v1", description: "Local API v1" },
  ],
  tags: [
    { name: "Health", description: "وضعیت سرویس" },
    { name: "Auth", description: "ثبت‌نام / ورود / خروج / me" },
    { name: "Models", description: "CRUD مدل‌ها" },
    { name: "Clients", description: "CRUD کارفرماها" },
    { name: "Jobs", description: "CRUD پروژه‌ها" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ApiOk: { type: "object", properties: { ok: { type: "boolean", example: true } } },
      ApiError: {
        type: "object",
        properties: { ok: { type: "boolean", example: false }, message: { type: "string" } },
      },
      RegisterBody: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          name: { type: "string" },
          role: { type: "string", enum: ["model", "client", "admin"] },
        },
      },
      LoginBody: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
          name: { type: "string", nullable: true },
          modelId: { type: "string", nullable: true },
          clientId: { type: "string", nullable: true },
        },
      },
      Client: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          company: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          instagram: { type: "string", nullable: true },
          isActive: { type: "boolean" },
        },
      },
      Job: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          budget: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          requirements: { type: "array", items: { type: "string" } },
          clientId: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiOk" } } } } },
      },
    },
    "/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "ثبت‌نام",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterBody" } } } },
        responses: { 201: { description: "Created" }, 400: { description: "Bad Request" }, 409: { description: "Duplicate email" } },
      },
    },
    "/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "ورود",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginBody" } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Bad Request" }, 401: { description: "Unauthorized" } },
      },
    },
    "/v1/auth/logout": {
      post: { tags: ["Auth"], summary: "خروج", responses: { 200: { description: "OK" } } },
    },
    "/v1/auth/me": {
      get: { tags: ["Auth"], summary: "کاربر فعلی", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } } },
    },
    "/v1/models": {
      get: { tags: ["Models"], summary: "لیست مدل‌ها", responses: { 200: { description: "OK" } } },
      post: { tags: ["Models"], summary: "ایجاد مدل", security: [{ bearerAuth: [] }], responses: { 201: { description: "Created" } } },
    },
    "/v1/clients": {
      get: { tags: ["Clients"], summary: "لیست کارفرماها", responses: { 200: { description: "OK" } } },
      post: { tags: ["Clients"], summary: "ایجاد کارفرما", security: [{ bearerAuth: [] }], responses: { 201: { description: "Created" } } },
    },
    "/v1/jobs": {
      get: { tags: ["Jobs"], summary: "لیست پروژه‌ها", responses: { 200: { description: "OK" } } },
      post: { tags: ["Jobs"], summary: "ایجاد پروژه", security: [{ bearerAuth: [] }], responses: { 201: { description: "Created" } } },
    },
  },
};

export default spec;
