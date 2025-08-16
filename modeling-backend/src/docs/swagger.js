// src/docs/swagger.js
// مستندات OpenAPI 3.1 برای بک‌اند مدلینگ
const spec = {
  openapi: "3.1.0",
  info: {
    title: "Modeling Backend API",
    description:
      "مستندات رسمی API بک‌اند مدلینگ: احراز هویت، مدل‌ها، کارفرماها و پروژه‌ها.\n\n" +
      "نکته: مسیرهای Jobs برای ایجاد/ویرایش/حذف نیاز به توکن Bearer دارند.",
    version: "1.0.0",
  },
  servers: [
    { url: "http://localhost:4000/api", description: "Local API root" },
    { url: "http://localhost:4000/api/v1", description: "Local API v1" },
  ],
  tags: [
    { name: "Health", description: "وضعیت سرویس" },
    { name: "Auth", description: "ثبت‌نام و ورود" },
    { name: "Models", description: "CRUD مدل‌ها" },
    { name: "Clients", description: "CRUD کارفرماها" },
    { name: "Jobs", description: "CRUD پروژه‌ها (با مالکیت/نقش)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      // عمومی
      ApiOk: {
        type: "object",
        properties: { ok: { type: "boolean", example: true } },
      },
      ApiError: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: false },
          message: { type: "string", example: "خطای معتبرسازی" },
        },
      },
      // Auth
      RegisterBody: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "user@example.com" },
          password: { type: "string", example: "test1234" },
          name: { type: "string", example: "Test User" },
          role: {
            type: "string",
            enum: ["model", "client", "admin"],
            example: "client",
          },
          modelId: { type: "string", nullable: true },
          clientId: { type: "string", nullable: true },
        },
      },
      LoginBody: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "user@example.com" },
          password: { type: "string", example: "test1234" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              _id: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
              name: { type: "string", nullable: true },
              modelId: { type: "string", nullable: true },
              clientId: { type: "string", nullable: true },
            },
          },
          token: { type: "string", example: "JWT_TOKEN_HERE" },
        },
      },
      // Models
      Model: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          height: { type: "number", nullable: true, example: 180 },
          size: { type: "string", nullable: true, example: "38-40" },
          city: { type: "string", nullable: true, example: "Tehran" },
          instagram: { type: "string", nullable: true, example: "@user" },
          bio: { type: "string", nullable: true },
          skills: { type: "array", items: { type: "string" } },
          photos: { type: "array", items: { type: "string" } },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
        },
      },
      ModelCreateBody: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Narges Kamali" },
          height: { type: "number", nullable: true },
          size: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          instagram: { type: "string", nullable: true },
          bio: { type: "string", nullable: true },
          skills: { type: "array", items: { type: "string" } },
          photos: { type: "array", items: { type: "string" } },
        },
      },
      // Clients
      Client: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          company: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          instagram: { type: "string", nullable: true },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
        },
      },
      ClientCreateBody: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Client Profile" },
          company: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          instagram: { type: "string", nullable: true },
        },
      },
      // Jobs
      Job: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          budget: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          requirements: { type: "array", items: { type: "string" } },
          clientId: { type: "string" },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
        },
      },
      JobCreateBody: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", example: "کستینگ بیوتی" },
          budget: { type: "string", nullable: true, example: "6,000,000" },
          city: { type: "string", nullable: true, example: "Tehran" },
          description: { type: "string", nullable: true, example: "3 ساعت عکاسی" },
          requirements: { type: "array", items: { type: "string" } },
          clientId: {
            type: "string",
            description: "ادمین می‌تواند clientId را تعیین کند. برای client از توکن خوانده می‌شود.",
          },
        },
      },
      // پاسخ‌های لیست
      ListModelsResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          total: { type: "number", example: 1 },
          page: { type: "number", example: 1 },
          limit: { type: "number", example: 10 },
          data: { type: "array", items: { $ref: "#/components/schemas/Model" } },
        },
      },
      ListClientsResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          total: { type: "number", example: 1 },
          page: { type: "number", example: 1 },
          limit: { type: "number", example: 10 },
          data: { type: "array", items: { $ref: "#/components/schemas/Client" } },
        },
      },
      ListJobsResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          total: { type: "number", example: 1 },
          page: { type: "number", example: 1 },
          limit: { type: "number", example: 10 },
          data: { type: "array", items: { $ref: "#/components/schemas/Job" } },
        },
      },
    },
  },
  paths: {
    // Health (بدون نسخه)
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health Check",
        responses: {
          200: {
            description: "سرویس سالم است",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiOk" } } },
          },
        },
      },
    },

    // Auth (v1)
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "ثبت‌نام کاربر جدید",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterBody" } } },
        },
        responses: {
          201: { description: "ثبت‌نام موفق", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          400: { description: "خطای ورودی", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          409: { description: "ایمیل تکراری", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "ورود کاربر",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginBody" } } },
        },
        responses: {
          200: { description: "ورود موفق", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          400: { description: "خطای ورودی", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          401: { description: "نامعتبر", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },

    // Models (v1, CRUD جنریک)
    "/models": {
      get: {
        tags: ["Models"],
        summary: "لیست مدل‌ها",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "city", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ListModelsResponse" } } } },
        },
      },
      post: {
        tags: ["Models"],
        summary: "ایجاد مدل",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ModelCreateBody" } } },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Model" } } } },
          400: { description: "خطای ورودی", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/models/{id}": {
      get: {
        tags: ["Models"],
        summary: "گرفتن مدل با شناسه",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Model" } } } },
          404: { description: "پیدا نشد", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
      patch: {
        tags: ["Models"],
        summary: "ویرایش مدل",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ModelCreateBody" } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Bad Request" }, 404: { description: "Not Found" } },
      },
      delete: {
        tags: ["Models"],
        summary: "حذف مدل",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Not Found" } },
      },
    },

    // Clients (v1, CRUD جنریک)
    "/clients": {
      get: {
        tags: ["Clients"],
        summary: "لیست کارفرماها",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "city", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ListClientsResponse" } } } },
        },
      },
      post: {
        tags: ["Clients"],
        summary: "ایجاد کارفرما",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ClientCreateBody" } } },
        },
        responses: { 201: { description: "Created" }, 400: { description: "Bad Request" } },
      },
    },
    "/clients/{id}": {
      get: {
        tags: ["Clients"],
        summary: "گرفتن کارفرما با شناسه",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Not Found" } },
      },
      patch: {
        tags: ["Clients"],
        summary: "ویرایش کارفرما",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ClientCreateBody" } } } },
        responses: { 200: { description: "OK" }, 400: { description: "Bad Request" }, 404: { description: "Not Found" } },
      },
      delete: {
        tags: ["Clients"],
        summary: "حذف کارفرما",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Not Found" } },
      },
    },

    // Jobs (v1, با امنیت روی POST/PATCH/DELETE)
    "/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "لیست پروژه‌ها",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "city", in: "query", schema: { type: "string" } },
          { name: "clientId", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ListJobsResponse" } } } },
        },
      },
      post: {
        tags: ["Jobs"],
        summary: "ایجاد پروژه (client/admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/JobCreateBody" } } },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Job" } } } },
          400: { description: "Bad Request", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/jobs/{id}": {
      get: {
        tags: ["Jobs"],
        summary: "گرفتن پروژه با شناسه",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Not Found" } },
      },
      patch: {
        tags: ["Jobs"],
        summary: "ویرایش پروژه (مالک یا admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/JobCreateBody" } } } },
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" }, 403: { description: "Forbidden" }, 404: { description: "Not Found" } },
      },
      delete: {
        tags: ["Jobs"],
        summary: "حذف پروژه (مالک یا admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" }, 403: { description: "Forbidden" }, 404: { description: "Not Found" } },
      },
    },
  },
};

export default spec;
