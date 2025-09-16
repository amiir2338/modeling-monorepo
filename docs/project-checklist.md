1) تعریف محصول و معماری

PRD یک‌صفحه‌ای (مسأله، پرسونای «مدل/کارفرما/ادمین»، سناریوهای اصلی)

User Journey + فلوهای حیاتی: ثبت‌نام/ورود، ایجاد آگهی، درخواست مدل، تأیید ادمین

ماتریس نقش‌ها/دسترسی‌ها (RBAC): admin, client, model

معماری ماژولار (Monorepo/Polyrepo)، لایه‌ها (API, Web, Worker)

مدل داده‌ها (ERD): Users, Profiles, Jobs, Applications, Messages, Media, Payments

خروجی: PRD + ERD + RBAC

معیار پذیرش: هیچ سناریوی حیاتی بدون مالک/ماژول نماند.


2) زیرساخت توسعه و استانداردها

ابزارها: Node/NPM نسخه ثابت، pnpm/yarn (یکی)، TS config مشترک

Lint/Format: ESLint + Prettier + Husky + lint-staged

Git Flow + نام‌گذاری برنچ، Conventional Commits + Auto Changelog

Env management: .env.example کامل، اسکریپت bootstrap

خروجی: ریپو آماده با اسکریپت‌های dev, build, test, lint

معیار پذیرش: CI اولین بار بدون خطا عبور کند.


3) بک‌اند (API)

Auth: JWT + Refresh + Forgot/Reset + Email/OTP (حداقل: ایمیل/رمز)

Users/Profiles: ایجاد، ویرایش، آپلود آواتار

Jobs: CRUD، فیلتر/جست‌وجو، وضعیت‌ها (draft/pending/approved/rejected)

Applications: مدل‌ها درخواست می‌دهند، کارفرما/ادمین بررسی می‌کند

Messages/Notifications: رویدادهای کلیدی (درخواست جدید، تأیید، رد)

Media: آپلود امن (S3/Cloud/Local)، محدودیت حجم/فرمت

Validations & Errors: Joi/Zod، کدهای خطا یکنواخت

Rate limiting + CORS + Helmet

مستندات OpenAPI/Swagger اتومات

خروجی: سرویس API نسخه v1

معیار پذیرش: پوشش تست واحد ≥ 50%، Swagger کامل مسیرهای حیاتی.


4) فرانت‌اند (وب)

Layout پایه، تم، ناوبری، محافظت مسیرها (Protected Routes)

Auth UI: ثبت‌نام/ورود، بازیابی رمز، مدیریت توکن‌ها (Axios Interceptors)

داشبورد کارفرما: ایجاد/ویرایش آگهی، لیست آگهی‌ها، وضعیت‌ها

داشبورد مدل: تکمیل پروفایل، جست‌وجوی آگهی‌ها، ارسال درخواست

پنل ادمین: تأیید/رد آگهی، مشاهده درخواست‌ها، مدیریت کاربران

صفحات فهرست/جزییات آگهی + فیلترها (شهر، بودجه، تگ‌ها)

آپلود تصویر/ویدیو با پیش‌نمایش و Progress

مدیریت خطا/Toasts یکنواخت، Empty/Loading states

خروجی: SPA آماده اتصال به API

معیار پذیرش: Lighthouse ≥ 85 (Performance/Best Practices/SEO).


5) تست خودکار و کیفیت

Unit/API: Jest/Supertest برای سرویس‌ها و روت‌ها

E2E: Playwright—فلو طلایی:
ثبت‌نام کارفرما → ساخت «draft» → سابمیت → تأیید ادمین → درخواست مدل → مشاهده وضعیت

Data seeding برای تست‌ها + Mock ایمیل/اس‌ام‌اس

گزارش‌ها: HTML/Allure + اسکرین‌شات/ویدیو شکست‌ها

خروجی: پوشه tests با سناریوهای سبز

معیار پذیرش: اجرای npx playwright test بدون Timeout و Fail حیاتی.


6) امنیت و پایداری

بررسی OWASP Top 10 (Auth, Injection, XSS, CSRF)

محدودسازی اندازه درخواست، ضد اسپم (Captcha برای فرم‌های عمومی)

لاگ ساختاریافته (request id)، ماسک داده‌های حساس

Healthcheck/Readiness، graceful shutdown

خروجی: چک‌لیست امنیت + تنظیمات اعمال‌شده

معیار پذیرش: گذر از اسکن‌های lint-security و تست‌های نفوذ پایه.


7) عملیات و دیپلوی

Dockerfile های prod + docker-compose (dev)

CI/CD: Build, Test, Lint, Deploy به staging و prod

محیط‌ها: dev/staging/prod با متغیرهای مجزا

مانیتورینگ: Metrics + Logs + Alerts (Uptime, Error rate)

خروجی: استیجینگ آنلاین + داکیومنت دیپلوی

معیار پذیرش: Zero-downtime و قابلیت Rollback.


8) آنالیتیکس و رشد

رویدادهای کلیدی: signup, create_job, apply, approve

GDPR-lite: consent، امکان حذف حساب

سئو پایه (متاتگ‌ها، اسکیما برای صفحات عمومی آگهی)

خروجی: داشبورد رویدادها

معیار پذیرش: رویدادها در ابزار آنالیتیکس دیده شوند.


9) محتوا و برندینگ

صفحه فرود: ارزش پیشنهادی، CTA ثبت‌نام

ایمیل/نوتیف قالب‌ها: خوش‌آمدگویی، تأیید آگهی، تغییر وضعیت درخواست

راهنمای استفاده کوتاه داخل اپ (Onboarding tips)

خروجی: متن‌ها + گرافیک‌های سبک برند

معیار پذیرش: یکنواختی لحن و UI.


10) آماده‌سازی لانچ

چک‌لیست قبل از لانچ: پرفورمنس، امنیت، دسترسی‌پذیری

سیاست‌های استفاده/حریم خصوصی

طرح پشتیبانی: باگ‌ریپورت، SLA پاسخ

خروجی: Go/No-Go checklist امضا شده

معیار پذیرش: همه بلوک‌های بحرانی سبز.