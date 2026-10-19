// Interface strings for the challenge page in English and Arabic. DAX itself (function names, engine error messages) stays English,
// exactly as it does in Power BI. The language comes from <html lang>.
export const EN = {
  loadFail: 'The editor could not load. Please refresh the page.',
  fieldInsert: 'Insert {name}',
  dataRows: 'First 8 of {n} rows.',
  runBadFormula: '⚠ Could not read that formula.',
  runBadEval: '⚠ The formula could not be evaluated.',
  badge: '{m} of {n} months match',
  runMatch: '✓ Your result matches the target. Submit it below.',
  runOk: 'Ran successfully. Compare with the target.',
  chartLabel: 'Your result compared with the target, by month',
  legendTarget: 'Target',
  legendYours: 'Your result',
  colMonth: 'Month',
  colYours: 'Your result',
  colTarget: 'Target',
  blank: '(blank)',
  matches: 'matches',
  noMatch: 'does not match',
  nameShort: 'Please enter your name (2 to 32 characters).',
  checking: 'Checking your measure against the data…',
  genericError: 'Something went wrong. Please try again.',
  correctAgain: 'Correct again! You’re already on the leaderboard at #{rank}.',
  correctPlain: '🎉 Correct! You’re #{rank} on the leaderboard.',
  correctOne: '🎉 Correct! You’re #{rank} on the leaderboard after 1 attempt.',
  correctMany: '🎉 Correct! You’re #{rank} on the leaderboard after {n} attempts.',
  closeHidden: 'Close: it works on the sample data but not on a second dataset. Look for an assumption that only holds for this data (a fixed month, a hard-coded number, an unusual case).',
  notYet: 'Not yet: {m} of {n} months match the target. Run it and compare the months that are off.',
  offline: 'Could not reach the server. Check your connection and try again.',
  lessThanMin: '< 1 min',
  minutes: '{n} min',
  hoursMinutes: '{h} h {m} min',
  hours: '{h} h',
  boardEmpty: 'Nobody has solved it yet. Be the first.',
  boardDown: 'The leaderboard is unavailable right now.',
  you: 'you',
  solved: '✓ solved',
  locked: '🔒 locked',
  levelDone: 'Level complete. ',
  next: 'Continue to {name} →',
  errName: 'Please enter a name between 2 and 32 characters (no links or @).',
  errRate: 'You are submitting a little too fast. Wait a minute and try again.',
  errLinkedin: 'The LinkedIn link should look like https://www.linkedin.com/in/your-name',
  errLocked: 'Solve Level {n} first to unlock this one.',
  errLong: 'That formula is too long (4,000 characters max).',
  errEmpty: 'Write your measure first.',
  errServer: 'Something went wrong on our side. Please try again.',
  edTitle: 'Measure',
  edHint: '<kbd>Ctrl</kbd>+<kbd>Space</kbd> suggestions · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> run',
  edLabel: 'DAX measure editor',
  edEmpty: 'Write a measure, for example: Total Sales = SUM ( Sales[Amount] )',
  edOk: '✓ No problems found',
  edProblem: '⚠ {message} (line {line}, column {col})',
  edSuggestions: 'Suggestions',
};

export const AR = {
  loadFail: 'تعذّر تحميل المحرر. حدّث الصفحة وحاول مرة أخرى.',
  fieldInsert: 'إدراج {name}',
  dataRows: 'أول 8 صفوف من {n}.',
  runBadFormula: '⚠ تعذّرت قراءة هذه المعادلة.',
  runBadEval: '⚠ تعذّر حساب المعادلة.',
  badge: 'تطابق {m} من {n} شهرًا',
  runMatch: '✓ نتيجتك تطابق الهدف. أرسل حلّك بالأسفل.',
  runOk: 'تم التشغيل بنجاح. قارن النتيجة بالهدف.',
  chartLabel: 'نتيجتك مقارنة بالهدف حسب الشهر',
  legendTarget: 'الهدف',
  legendYours: 'نتيجتك',
  colMonth: 'الشهر',
  colYours: 'نتيجتك',
  colTarget: 'الهدف',
  blank: '(فارغ)',
  matches: 'مطابق',
  noMatch: 'غير مطابق',
  nameShort: 'اكتب اسمك (من حرفين إلى 32 حرفًا).',
  checking: 'جارٍ فحص الـ measure على البيانات…',
  genericError: 'حدث خطأ ما. حاول مرة أخرى.',
  correctAgain: 'إجابة صحيحة مرة أخرى! أنت بالفعل في لوحة المتصدرين بالمركز #{rank}.',
  correctPlain: '🎉 إجابة صحيحة! مركزك #{rank} في لوحة المتصدرين.',
  correctOne: '🎉 إجابة صحيحة! مركزك #{rank} في لوحة المتصدرين من المحاولة الأولى.',
  correctMany: '🎉 إجابة صحيحة! مركزك #{rank} في لوحة المتصدرين بعد {n} محاولات.',
  closeHidden: 'اقتربت: الحل يعمل على بيانات المثال لكنه لا يعمل على مجموعة بيانات ثانية. ابحث عن افتراض يصلح لهذه البيانات فقط (شهر ثابت، رقم مكتوب يدويًا، حالة غير معتادة).',
  notYet: 'ليس بعد: تطابق {m} من {n} شهرًا مع الهدف. شغّل الـ measure وقارن الأشهر المختلفة.',
  offline: 'تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.',
  lessThanMin: 'أقل من دقيقة',
  minutes: '{n} دقيقة',
  hoursMinutes: '{h} ساعة و{m} دقيقة',
  hours: '{h} ساعة',
  boardEmpty: 'لم يحلّها أحد بعد. كن الأول.',
  boardDown: 'لوحة المتصدرين غير متاحة الآن.',
  you: 'أنت',
  solved: '✓ تم الحل',
  locked: '🔒 مغلق',
  levelDone: 'أنهيت هذا المستوى. ',
  next: 'تابع إلى {name} ←',
  errName: 'اكتب اسمًا من حرفين إلى 32 حرفًا (بدون روابط أو @).',
  errRate: 'ترسل الحلول بسرعة كبيرة. انتظر دقيقة وحاول مرة أخرى.',
  errLinkedin: 'يجب أن يكون رابط LinkedIn بهذا الشكل: https://www.linkedin.com/in/your-name',
  errLocked: 'حُلّ المستوى {n} أولًا لفتح هذا المستوى.',
  errLong: 'المعادلة طويلة جدًا (الحد الأقصى 4000 حرف).',
  errEmpty: 'اكتب الـ measure أولًا.',
  errServer: 'حدث خطأ من جانبنا. حاول مرة أخرى.',
  edTitle: 'Measure',
  edHint: '<kbd>Ctrl</kbd>+<kbd>Space</kbd> اقتراحات · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> تشغيل',
  edLabel: 'محرر DAX',
  edEmpty: 'اكتب measure، مثال: Total Sales = SUM ( Sales[Amount] )',
  edOk: '✓ لا توجد مشاكل',
  edProblem: '⚠ {message} (السطر {line}، العمود {col})',
  edSuggestions: 'اقتراحات',
};

export const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

export const LEVEL_NUMBER = { aov: 1, growth: 2, retention: 3 };

export const lang = typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar' : 'en';
const dict = lang === 'ar' ? AR : EN;

/** t('badge', {m: 3, n: 12}) */
export const t = (key, params = {}) => String(dict[key] ?? EN[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
export const months = MONTHS[lang];

/** Server error codes → translated text (falls back to the server's own message, e.g. DAX errors). */
export function serverError(data) {
  const map = { name: 'errName', rate: 'errRate', linkedin: 'errLinkedin', long: 'errLong', empty: 'errEmpty', server: 'errServer' };
  if (data.locked) return t('errLocked', { n: LEVEL_NUMBER[data.requires] ?? '' });
  if (map[data.code]) return t(map[data.code]);
  return data.error || t('genericError');
}
