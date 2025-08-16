// موقتی برای دیباگ: پیدا کردن repeat(count<0)
const __origRepeat = String.prototype.repeat;

String.prototype.repeat = function (count: number): string {
  if (typeof count === 'number' && count < 0) {
    console.error('[repeat-guard] count<0:', count, 'on string:', String(this));
    console.trace('[repeat-guard trace]');
    count = 0; // جلوگیری از کرش
  }
  return __origRepeat.call(this, count);
};

console.log('[repeat-guard] loaded');
