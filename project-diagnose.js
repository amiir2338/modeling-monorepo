const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

// مسیر ریشه پروژه
const projectRoot = path.resolve(__dirname, '..'); // مسیر اصلی پروژه شما

// مسیرهای دقیق برای فرانت‌اند و بک‌اند
const frontendPath = path.join(projectRoot, 'modeling-frontend');
const backendPath = path.join(projectRoot, 'modeling-backend');

// مسیر ذخیره‌سازی لاگ‌ها
const logFilePath = path.join(projectRoot, 'project-diagnose-log.txt');

// تابع برای نوشتن لاگ‌ها
const log = (message) => {
  const timestamp = (new Date()).toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFilePath, logMessage + '\n');
};

// 1. نمایش اطلاعات وابستگی‌های نصب‌شده در فرانت‌اند
const listFrontendPackages = () => {
  log('--- Frontend Packages ---');
  execSync('cd modeling-frontend && npm list --depth=0', { stdio: 'inherit' });
};

// 2. نمایش اطلاعات وابستگی‌های نصب‌شده در بک‌اند
const listBackendPackages = () => {
  log('--- Backend Packages ---');
  execSync('cd modeling-backend && npm list --depth=0', { stdio: 'inherit' });
};

// 3. نمایش محتویات package.json در فرانت‌اند
const showFrontendPackageJson = () => {
  log('--- Frontend package.json ---');
  const packageJson = require(path.join(frontendPath, 'package.json'));
  log(JSON.stringify(packageJson, null, 2)); // لاگ محتویات package.json
};

// 4. نمایش محتویات package.json در بک‌اند
const showBackendPackageJson = () => {
  log('--- Backend package.json ---');
  const packageJson = require(path.join(backendPath, 'package.json'));
  log(JSON.stringify(packageJson, null, 2)); // لاگ محتویات package.json
};

// 5. جستجوی فایل‌های JavaScript و TypeScript در فرانت‌اند
const listFrontendJsTsFiles = () => {
  log('--- Frontend JavaScript and TypeScript Files ---');
  const jsTsFiles = execSync('find modeling-frontend -name "*.js" -or -name "*.jsx" -or -name "*.ts" -or -name "*.tsx"', { encoding: 'utf8' });
  log(jsTsFiles);
};

// 6. جستجوی فایل‌های JavaScript و TypeScript در بک‌اند
const listBackendJsTsFiles = () => {
  log('--- Backend JavaScript and TypeScript Files ---');
  const jsTsFiles = execSync('find modeling-backend -name "*.js" -or -name "*.jsx" -or -name "*.ts" -or -name "*.tsx"', { encoding: 'utf8' });
  log(jsTsFiles);
};

// 7. جستجو برای مسیرهای API در فرانت‌اند
const listFrontendApiRoutes = () => {
  log('--- Frontend API Routes ---');
  const apiRoutes = execSync('grep -r "/api" modeling-frontend', { encoding: 'utf8' });
  log(apiRoutes);
};

// 8. جستجو برای مسیرهای API در بک‌اند
const listBackendApiRoutes = () => {
  log('--- Backend API Routes ---');
  const apiRoutes = execSync('grep -r "/api" modeling-backend', { encoding: 'utf8' });
  log(apiRoutes);
};

// 9. جستجوی توکن‌ها در فرانت‌اند
const listFrontendTokens = () => {
  log('--- Frontend Token Usage ---');
  const tokenFiles = execSync('grep -r "token" modeling-frontend', { encoding: 'utf8' });
  log(tokenFiles);
};

// 10. جستجوی توکن‌ها در بک‌اند
const listBackendTokens = () => {
  log('--- Backend Token Usage ---');
  const tokenFiles = execSync('grep -r "token" modeling-backend', { encoding: 'utf8' });
  log(tokenFiles);
};

// 11. جستجوی axios و fetch در فرانت‌اند
const listFrontendAxiosFetch = () => {
  log('--- Frontend Axios/Fetch Usage ---');
  const axiosUsage = execSync('grep -r "axios" modeling-frontend', { encoding: 'utf8' });
  log(axiosUsage);

  const fetchUsage = execSync('grep -r "fetch" modeling-frontend', { encoding: 'utf8' });
  log(fetchUsage);
};

// 12. جستجوی axios و fetch در بک‌اند
const listBackendAxiosFetch = () => {
  log('--- Backend Axios/Fetch Usage ---');
  const axiosUsage = execSync('grep -r "axios" modeling-backend', { encoding: 'utf8' });
  log(axiosUsage);

  const fetchUsage = execSync('grep -r "fetch" modeling-backend', { encoding: 'utf8' });
  log(fetchUsage);
};

// اجرای تمام مراحل جمع‌آوری اطلاعات
const runDiagnostics = () => {
  log('Starting project diagnostics...');
  
  listFrontendPackages();
  listBackendPackages();
  showFrontendPackageJson();
  showBackendPackageJson();
  listFrontendJsTsFiles();
  listBackendJsTsFiles();
  listFrontendApiRoutes();
  listBackendApiRoutes();
  listFrontendTokens();
  listBackendTokens();
  listFrontendAxiosFetch();
  listBackendAxiosFetch();

  log('Project diagnostics completed. Log file created at:', logFilePath);
};

// شروع تست‌ها
runDiagnostics();
