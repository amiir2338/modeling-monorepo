// موقتی برای دیباگ: پیدا کردن repeat(count<0)
const __origRepeat = String.prototype.repeat;

String.prototype.repeat = function (count: number): string {
  if (typeof count === 'number' && count < 0) {
    // لاگ و استک برای شناسایی منبع
    console.error('[repeat-guard] count<0:', count, 'on string:', String(this));
    // استک‌تریس کامل:
    console.trace('[repeat-guard trace]');
    // تا کرش نکنه:
    count = 0;
  }
  return __origRepeat.call(this, count);
};
