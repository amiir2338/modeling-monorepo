const supertest = require('supertest');
const faker = require('@faker-js/faker');

const app = require('./path_to_your_app'); // مسیر اپلیکیشن خود را وارد کنید

const request = supertest(app); // ایجاد یک درخواست برای تست

// تابع برای ساخت کاربر جدید
const createUser = async () => {
  const user = {
    email: faker.internet.email(),
    password: faker.internet.password(),
  };

  // ساخت کاربر از API (ثبت‌نام)
  const res = await request.post('/api/v1/auth/register')
    .send(user)
    .expect(201); // باید 201 برای موفقیت دریافت کنید

  return res.body; // اطلاعات کاربر را باز می‌گرداند
};

// تابع برای ورود به سیستم
const loginUser = async (email, password) => {
  const res = await request.post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200); // باید 200 برای موفقیت دریافت کنید

  return res.body.token; // توکن دریافتی را باز می‌گرداند
};

// تست گرفتن توکن
const testAuthFlow = async () => {
  // 1. ساخت کاربر جدید
  const user = await createUser();
  console.log('Created user:', user);

  // 2. ورود به سیستم
  const token = await loginUser(user.email, user.password);
  console.log('Received token:', token);

  // 3. تست توکن: ارسال درخواست با توکن به یکی از API‌های محافظت‌شده
  const res = await request.get('/api/v1/protected-route')
    .set('Authorization', `Bearer ${token}`)
    .expect(200); // باید 200 برای موفقیت دریافت کنید

  console.log('Protected route response:', res.body);
};

// تست تمام مسیرها
const testAllRoutes = async () => {
  try {
    // 1. تست ساخت کاربر و دریافت توکن
    await testAuthFlow();

    // 2. بررسی چندین مسیر API
    const routes = [
      { method: 'get', route: '/api/v1/jobs' },
      { method: 'post', route: '/api/v1/jobs', body: { title: 'Test Job', description: 'Job description' } },
      // اضافه کردن سایر مسیرها که باید تست شوند
    ];

    for (let route of routes) {
      const res = await request[route.method](route.route)
        .send(route.body || {})
        .expect(200); // یا هر وضعیت کد مورد نظر برای موفقیت
      console.log(`Route ${route.route} response:`, res.body);
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
};

// اجرای تمام تست‌ها
testAllRoutes();
