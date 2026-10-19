// The DAX challenge pages: three levels that unlock in order, in English and Arabic. Static HTML, readable without
// JavaScript; assets/dax/challenge.js makes it interactive. Levels are defined once and rendered with one template.
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// Flip to true when the walkthrough goes out; the solution is not shipped to the browser until then.
export const REVEAL_SOLUTION = false;

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

export const LEVELS = [
  {
    id: 'aov', level: 1, file: 'dax-challenge.html', pretty: '/dax-challenge', minutes: 2, format: 'money',
    en: {
      name: 'Average order',
      eyebrow: 'DAX Challenge · Level 1 of 3 · warm-up · about 2 minutes',
      title: 'What does an average order look like?',
      lead: 'A quick one to start. The sales team wants the average value of an order, for any month or city they pick. Write the measure, see it match the target, and unlock the next level.',
      tags: ['Warm-up', 'Measures', 'DIVIDE'],
      heading: 'Average order value by month, 2024.',
      targetColumn: 'Average order value (target)',
      rules: [
        'Average order value is <strong>total sales ÷ number of orders</strong>.',
        'You get a ready-made measure, <strong>[Total Sales]</strong>. Every row of the Sales table is one order.',
        'It must respond to the month and <em>City</em> filters, and never show an error.',
        'Write <strong>one measure</strong>. Any approach is welcome: you are graded on the numbers it produces, not on how it looks.',
      ],
      hints: [
        ['Hint 1: how to think about it', 'You already have the numerator: <code>[Total Sales]</code>. The missing piece is how many orders there were. Orders are the rows of the Sales table, and each has its own <code>OrderID</code>.'],
        ['Hint 2: the tools', 'Count the orders with <code>COUNTROWS</code> or <code>DISTINCTCOUNT</code>, and divide with <code>DIVIDE</code> so an empty month never causes an error. There is more than one way to get there.'],
      ],
      description: 'A 2-minute DAX warm-up: calculate average order value with a measure. Write it in a Power BI-style editor, get graded instantly and unlock the next level.',
    },
    ar: {
      name: 'متوسط الطلب',
      eyebrow: 'تحدي DAX · المستوى 1 من 3 · تمهيدي · حوالي دقيقتين',
      title: 'كم يبلغ متوسط قيمة الطلب؟',
      lead: 'بداية سريعة. فريق المبيعات يريد متوسط قيمة الطلب لأي شهر أو مدينة يختارونها. اكتب الـ measure وشاهد نتيجتك تطابق الهدف، ثم افتح المستوى التالي.',
      tags: ['تمهيدي', 'Measures', 'DIVIDE'],
      heading: 'متوسط قيمة الطلب حسب الشهر، 2024.',
      targetColumn: 'متوسط قيمة الطلب (الهدف)',
      rules: [
        'متوسط قيمة الطلب = <strong>إجمالي المبيعات ÷ عدد الطلبات</strong>.',
        'لديك measure جاهز اسمه <strong>[Total Sales]</strong>. كل صف في جدول Sales هو طلب واحد.',
        'يجب أن يستجيب لفلاتر الشهر و<em>City</em>، وألا يُظهر أي خطأ.',
        'اكتب <strong>measure واحدًا</strong>. أي طريقة مقبولة: التقييم يعتمد على الأرقام الناتجة، لا على شكل الكود.',
      ],
      hints: [
        ['تلميح 1: كيف تفكر في المسألة', 'البسط جاهز: <code>[Total Sales]</code>. الناقص هو عدد الطلبات. الطلبات هي صفوف جدول Sales، ولكل طلب <code>OrderID</code> خاص به.'],
        ['تلميح 2: الأدوات', 'يمكنك عدّ الطلبات بـ <code>COUNTROWS</code> أو <code>DISTINCTCOUNT</code>، والقسمة بـ <code>DIVIDE</code> حتى لا يظهر خطأ في شهر بلا طلبات. وهناك أكثر من طريقة للوصول للحل.'],
      ],
      description: 'تحدي DAX تمهيدي في دقيقتين: احسب متوسط قيمة الطلب بـ measure. اكتبه في محرر شبيه بـ Power BI، واحصل على التقييم فورًا، وافتح المستوى التالي.',
    },
  },
  {
    id: 'growth', level: 2, file: 'dax-challenge-growth.html', pretty: '/dax-challenge-growth', minutes: 5, format: 'percent',
    en: {
      name: 'Did sales grow?',
      eyebrow: 'DAX Challenge · Level 2 of 3 · about 5 minutes',
      title: 'Did sales grow?',
      lead: 'The manager asks one question every month: are we selling more than last month? Write the measure that gives the month-over-month growth, see it match the target, and join the leaderboard.',
      tags: ['Time intelligence', 'CALCULATE', 'Variables'],
      heading: 'Month-over-month sales growth, 2024.',
      targetColumn: 'Growth (target)',
      rules: [
        'Growth for a month is <strong>(this month’s sales − last month’s sales) ÷ last month’s sales</strong>.',
        'You get a ready-made measure, <strong>[Total Sales]</strong>, so you don’t need to sum the Amount column yourself.',
        'Return a <strong>ratio</strong>, for example <code>0.25</code> for +25%. In Power BI you would format it as a percentage.',
        'January compares with December of the previous year. It must also respond to the <em>City</em> filter, and never show a divide-by-zero error.',
        'Write <strong>one measure</strong>. Any approach is welcome: you are graded on the numbers it produces, not on how it looks. It is also tested on a second dataset you can’t see.',
      ],
      hints: [
        ['Hint 1: how to think about it', 'You need two numbers: this month’s sales and last month’s sales. <code>[Total Sales]</code> already gives you the first one. The question is how to get the second one.'],
        ['Hint 2: the tools', '<code>CALCULATE</code> lets you change the filter context, and a time-intelligence function such as <code>DATEADD</code> can move the dates back by one month. Store each number in a <code>VAR</code> to keep the formula readable, and use <code>DIVIDE</code> so a zero never causes an error.'],
      ],
      description: 'A hands-on DAX challenge: calculate month-over-month sales growth with time intelligence. Write the measure in a Power BI-style editor, get graded instantly and join the leaderboard.',
    },
    ar: {
      name: 'هل زادت المبيعات؟',
      eyebrow: 'تحدي DAX · المستوى 2 من 3 · حوالي 5 دقائق',
      title: 'هل زادت المبيعات؟',
      lead: 'يسأل المدير كل شهر السؤال نفسه: هل نبيع أكثر من الشهر الماضي؟ اكتب الـ measure الذي يحسب نمو المبيعات شهريًا، وشاهد نتيجتك تطابق الهدف، وادخل لوحة المتصدرين.',
      tags: ['Time intelligence', 'CALCULATE', 'المتغيرات'],
      heading: 'نمو المبيعات مقارنة بالشهر السابق، 2024.',
      targetColumn: 'النمو (الهدف)',
      rules: [
        'نمو أي شهر = <strong>(مبيعات هذا الشهر − مبيعات الشهر الماضي) ÷ مبيعات الشهر الماضي</strong>.',
        'لديك measure جاهز <strong>[Total Sales]</strong>، فلا تحتاج لجمع عمود Amount بنفسك.',
        'أعد <strong>نسبة</strong>، مثل <code>0.25</code> لنمو 25%. في Power BI ستعرضها بتنسيق نسبة مئوية.',
        'يُقارَن شهر يناير بديسمبر من السنة السابقة. ويجب أن يستجيب لفلتر <em>City</em> وألا يُظهر خطأ القسمة على صفر.',
        'اكتب <strong>measure واحدًا</strong>. أي طريقة مقبولة: التقييم يعتمد على الأرقام الناتجة لا على شكل الكود، ويُختبر أيضًا على بيانات ثانية لا تراها.',
      ],
      hints: [
        ['تلميح 1: كيف تفكر في المسألة', 'تحتاج رقمين: مبيعات هذا الشهر ومبيعات الشهر الماضي. <code>[Total Sales]</code> يعطيك الأول. والسؤال: كيف تحصل على الثاني؟'],
        ['تلميح 2: الأدوات', '<code>CALCULATE</code> تتيح لك تغيير سياق الفلترة، ودالة Time intelligence مثل <code>DATEADD</code> تُرجع التواريخ شهرًا للخلف. خزّن كل رقم في <code>VAR</code> ليبقى الكود مقروءًا، واستخدم <code>DIVIDE</code> حتى لا يحدث خطأ عند القسمة على صفر.'],
      ],
      description: 'تحدي DAX عملي: احسب نمو المبيعات شهريًا باستخدام Time intelligence. اكتب الـ measure في محرر شبيه بـ Power BI، واحصل على التقييم فورًا، وادخل لوحة المتصدرين.',
    },
  },
  {
    id: 'retention', level: 3, file: 'dax-challenge-retention.html', pretty: '/dax-challenge-retention', minutes: 10, format: 'count',
    en: {
      name: 'Who came back?',
      eyebrow: 'DAX Challenge · Level 3 of 3 · the hard one · about 10 minutes',
      title: 'Who came back?',
      lead: 'Marketing wants one retention number they can trust. In any month, how many customers bought again after buying the month before? This one takes real filter-context thinking.',
      tags: ['Table functions', 'Filter context', 'Time intelligence'],
      heading: 'Retained customers by month, 2024.',
      targetColumn: 'Retained (target)',
      rules: [
        'A customer is <strong>retained</strong> in a month if they ordered in that month <strong>and</strong> in the month before.',
        'Each customer counts <strong>once</strong>, however many orders they placed.',
        'It must work in a visual by month, and respond to the <em>City</em> filter. January looks back to December of the previous year.',
        'Write <strong>one measure</strong>. Any approach is welcome: you are graded on the numbers it produces, not on how it looks. It is also tested on a second dataset you can’t see.',
      ],
      hints: [
        ['Hint 1: how to think about it', 'Think in tables, not numbers. You need the list of customers who bought in the current month, and the list of customers who bought in the previous month. Then the question is which customers are on both lists.'],
        ['Hint 2: the tools', 'One function compares two tables by their rows; a time-intelligence function can shift the dates in the filter context by a month. Variables (<code>VAR</code>) keep the two lists readable. There is more than one way to get there.'],
      ],
      description: 'The hardest DAX challenge: measure customer retention by month with real filter-context logic. Write the measure in a Power BI-style editor, get graded instantly and join the leaderboard.',
    },
    ar: {
      name: 'من عاد للشراء؟',
      eyebrow: 'تحدي DAX · المستوى 3 من 3 · الأصعب · حوالي 10 دقائق',
      title: 'من عاد للشراء؟',
      lead: 'يريد فريق التسويق رقمًا موثوقًا لاحتفاظ العملاء. في أي شهر، كم عميلًا اشترى مرة أخرى بعد أن اشترى في الشهر السابق؟ هذه المسألة تحتاج تفكيرًا حقيقيًا في سياق الفلترة.',
      tags: ['دوال الجداول', 'سياق الفلترة', 'Time intelligence'],
      heading: 'العملاء العائدون حسب الشهر، 2024.',
      targetColumn: 'العائدون (الهدف)',
      rules: [
        'يُعدّ العميل <strong>عائدًا</strong> في شهر ما إذا اشترى في هذا الشهر <strong>وأيضًا</strong> في الشهر الذي قبله.',
        'يُحسب كل عميل <strong>مرة واحدة</strong> مهما بلغ عدد طلباته.',
        'يجب أن يعمل في أي visual حسب الشهر، وأن يستجيب لفلتر <em>City</em>. ويرجع شهر يناير إلى ديسمبر من السنة السابقة.',
        'اكتب <strong>measure واحدًا</strong>. أي طريقة مقبولة: التقييم يعتمد على الأرقام الناتجة لا على شكل الكود، ويُختبر أيضًا على بيانات ثانية لا تراها.',
      ],
      hints: [
        ['تلميح 1: كيف تفكر في المسألة', 'فكّر في الجداول لا في الأرقام. تحتاج قائمة العملاء الذين اشتروا في الشهر الحالي، وقائمة من اشتروا في الشهر السابق. ثم السؤال: من يظهر في القائمتين معًا؟'],
        ['تلميح 2: الأدوات', 'توجد دالة تقارن جدولين حسب الصفوف، ودالة Time intelligence تُزيح التواريخ في سياق الفلترة شهرًا. المتغيرات (<code>VAR</code>) تُبقي القائمتين مقروءتين. وهناك أكثر من طريقة للوصول للحل.'],
      ],
      description: 'أصعب تحديات DAX: احسب احتفاظ العملاء شهريًا بمنطق حقيقي لسياق الفلترة. اكتب الـ measure في محرر شبيه بـ Power BI، واحصل على التقييم فورًا، وادخل لوحة المتصدرين.',
    },
  },
];

// Page chrome, by language.
const TEXT = {
  en: {
    back: 'Back to the portfolio', stepsLabel: 'Challenge levels', minutes: n => `about ${n} min`,
    counters: ['visited', 'tried it', 'solved it'], countersLabel: 'Challenge activity',
    start: 'Start the challenge', seeBoard: 'See the leaderboard', brief: 'The brief',
    dataNote: 'The data is fictional. Download it as CSV to try the measure in your own Power BI Desktop.',
    modelCaption: 'The model: Customers and Date each filter Sales (one-to-many).',
    modelLabel: 'Data model: Customers relates to Sales by CustomerID, and Date relates to Sales by OrderDate. Both are one-to-many into Sales.',
    modelTitle: 'Data model', target: 'The target', targetTitle: 'Your measure should produce this.', matchEvery: 'Match every month and you’re in.',
    chartCaption: 'Expected result of the measure, month by month.', month: 'Month', tableCaption: ' and the expected result by month',
    yourTurn: 'Your turn', write: 'Write the measure.', typeLike: 'Type like you would in Power BI: suggestions appear for functions, tables, columns and measures.',
    lockTitle: n => `Level ${n} is locked.`, lockText: (n, name) => `Solve Level ${n} (${name}) first. It takes a couple of minutes and unlocks this one.`, lockGo: n => `Go to Level ${n}`,
    noscript: 'The interactive editor needs JavaScript. You can still download the data above and solve it in Power BI Desktop.',
    fields: 'Fields', run: 'Run', reset: 'Reset', resultTitle: 'Your result vs the target', submitTitle: 'Submit your solution',
    submitText: 'When your result matches, submit it. Correct solutions are ranked by who solved it first.',
    yourName: 'Your name', namePlaceholder: 'How should we list you?', linkedin: 'LinkedIn profile', optional: '(optional)', submitButton: 'Submit my solution',
    privacy: 'We store your name, optional LinkedIn link, the formula you submit, and anonymous visit counts (a random id in your browser, no cookies, no IP address). Browsers sending Do Not Track or Global Privacy Control are not counted.',
    browseData: 'Browse the data', nextLevel: (n, name) => `Level ${n}: ${name}`,
    leaderboard: n => `Leaderboard · Level ${n}`, solvedIt: 'Solved it.', boardText: 'Ranked by who got a correct answer first. Attempts show how many tries it took.',
    cols: ['#', 'Name', 'Attempts', 'Time to solve', 'Solved'], loading: 'Loading the leaderboard…',
    stuck: 'Stuck? Two nudges.', walkthroughSoon: 'The full walkthrough, with several approaches, will be shared on LinkedIn once the challenge closes.', walkthroughOut: 'The walkthrough is out. See the LinkedIn post for the full solution.',
    cta: 'Need this kind of logic in your own reports?', ctaButton: 'Talk to Omar', activeFallback: 'Active customers',
    titlePrefix: n => `DAX Challenge Level ${n}`, titleSuffix: 'Omar Magdy',
    formats: { percent: 'Month-over-month growth', money: 'Average order value', count: 'Retained customers' },
    chartTitle: l => `${l}, 2024`, ctxLabel: { 'Total Sales': 'Total Sales', 'Active Customers': 'Active customers' },
  },
  ar: {
    back: 'العودة إلى معرض الأعمال', stepsLabel: 'مستويات التحدي', minutes: n => `حوالي ${n} ${n === 2 ? 'دقيقتين' : 'دقائق'}`,
    counters: ['زيارة', 'جرّبوه', 'حلّوه'], countersLabel: 'نشاط التحدي',
    start: 'ابدأ التحدي', seeBoard: 'شاهد لوحة المتصدرين', brief: 'المطلوب',
    dataNote: 'البيانات وهمية. حمّلها بصيغة CSV لتجرّب الـ measure في Power BI Desktop على جهازك.',
    modelCaption: 'النموذج: جدولا Customers وDate يفلتران جدول Sales (علاقة واحد إلى متعدد).',
    modelLabel: 'نموذج البيانات: جدول Customers مرتبط بجدول Sales عبر CustomerID، وجدول Date مرتبط بـ Sales عبر OrderDate، وكلتا العلاقتين واحد إلى متعدد نحو Sales.',
    modelTitle: 'نموذج البيانات', target: 'الهدف', targetTitle: 'يجب أن ينتج الـ measure هذه النتيجة.', matchEvery: 'طابق كل الأشهر وتدخل المنافسة.',
    chartCaption: 'النتيجة المتوقعة للـ measure شهرًا بشهر.', month: 'الشهر', tableCaption: ' والنتيجة المتوقعة حسب الشهر',
    yourTurn: 'دورك الآن', write: 'اكتب الـ measure.', typeLike: 'اكتب كما تفعل في Power BI: تظهر اقتراحات للدوال والجداول والأعمدة والـ measures.',
    lockTitle: n => `المستوى ${n} مغلق.`, lockText: (n, name) => `حُلّ المستوى ${n} (${name}) أولًا. يستغرق دقائق قليلة ويفتح لك هذا المستوى.`, lockGo: n => `اذهب إلى المستوى ${n}`,
    noscript: 'المحرر التفاعلي يحتاج JavaScript. يمكنك مع ذلك تحميل البيانات بالأعلى وحل المسألة في Power BI Desktop.',
    fields: 'الحقول', run: 'تشغيل', reset: 'إعادة', resultTitle: 'نتيجتك مقابل الهدف', submitTitle: 'أرسل حلّك',
    submitText: 'عندما تتطابق نتيجتك مع الهدف، أرسلها. تُرتَّب الحلول الصحيحة بحسب من حلّها أولًا.',
    yourName: 'اسمك', namePlaceholder: 'بأي اسم تريد أن يظهر؟', linkedin: 'حسابك على LinkedIn', optional: '(اختياري)', submitButton: 'أرسل حلّي',
    privacy: 'نحفظ اسمك ورابط LinkedIn (إن أضفته) والمعادلة التي ترسلها، وأعدادًا مجهولة للزيارات (معرّف عشوائي في متصفحك، بلا ملفات تعريف ارتباط ولا عنوان IP). المتصفحات التي ترسل Do Not Track أو Global Privacy Control لا تُحتسب.',
    browseData: 'استعرض البيانات', nextLevel: (n, name) => `المستوى ${n}: ${name}`,
    leaderboard: n => `لوحة المتصدرين · المستوى ${n}`, solvedIt: 'من حلّوها.', boardText: 'الترتيب بحسب من حصل على إجابة صحيحة أولًا. عدد المحاولات يوضح كم مرة جرّب كل شخص.',
    cols: ['#', 'الاسم', 'المحاولات', 'زمن الحل', 'تاريخ الحل'], loading: 'جارٍ تحميل لوحة المتصدرين…',
    stuck: 'علقت؟ تلميحان.', walkthroughSoon: 'سيُنشر الشرح الكامل بعدة طرق للحل على LinkedIn بعد انتهاء التحدي.', walkthroughOut: 'صدر الشرح. راجع منشور LinkedIn للحل الكامل.',
    cta: 'هل تحتاج هذا النوع من المنطق في تقاريرك؟', ctaButton: 'تواصل مع عمر', activeFallback: 'العملاء النشطون',
    titlePrefix: n => `تحدي DAX المستوى ${n}`, titleSuffix: 'عمر مجدي',
    formats: { percent: 'نمو المبيعات شهريًا', money: 'متوسط قيمة الطلب', count: 'العملاء العائدون' },
    chartTitle: l => `${l}، 2024`, ctxLabel: { 'Total Sales': 'إجمالي المبيعات', 'Active Customers': 'العملاء النشطون' },
  },
};

const FORMATS = {
  percent: { cell: v => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`, axis: v => `${Math.round(v)}%`, scale: 100 },
  money: { cell: v => v.toFixed(2), axis: v => String(Math.round(v)), scale: 1 },
  count: { cell: v => String(v), axis: v => String(Math.round(v)), scale: 1 },
};
const money = v => v.toLocaleString('en-US', { maximumFractionDigits: 0 });
const ltr = html => `<bdi dir="ltr">${html}</bdi>`;

function niceStep(range) {
  const raw = range / 3 || 1, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/** Bar chart with a zero line, so negative months hang below it. The chart itself always reads left to right. */
function targetChart(values, format, lang, label, title) {
  const f = FORMATS[format], months = MONTHS[lang];
  const vals = values.map(v => v * f.scale);
  const W = 720, H = 300, left = 44, right = 12, top = 30, bottom = 40;
  const hi = Math.max(0, ...vals), lo = Math.min(0, ...vals);
  const step = niceStep(hi - lo);
  const max = Math.ceil(hi / step) * step, min = Math.floor(lo / step) * step;
  const y = v => top + (H - top - bottom) * (1 - (v - min) / (max - min || 1));
  const band = (W - left - right) / vals.length, bar = Math.min(34, band * 0.62);
  const ticks = [min, 0, max].filter((t, i, a) => a.indexOf(t) === i).map(t => `<g><line class="chart-grid${t === 0 ? ' chart-zero' : ''}" x1="${left}" x2="${W - right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="chart-axis" x="${left - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${f.axis(t)}</text></g>`).join('');
  const bars = vals.map((v, i) => {
    const x = left + band * i + (band - bar) / 2, y0 = y(0), y1 = y(v);
    const top0 = Math.min(y0, y1), h = Math.abs(y0 - y1);
    const labelY = v >= 0 ? top0 - 6 : top0 + h + 14;
    return `<g><rect class="chart-bar${v < 0 ? ' chart-bar--neg' : ''}" x="${x.toFixed(1)}" y="${top0.toFixed(1)}" width="${bar.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="2"/><text class="chart-value" x="${(x + bar / 2).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle">${f.axis(v)}</text><text class="chart-axis" x="${(x + bar / 2).toFixed(1)}" y="${H - 14}" text-anchor="middle">${months[i]}</text></g>`;
  }).join('');
  const aria = `${label}: ${values.map((v, i) => `${months[i]} ${f.cell(v)}`).join('، ')}.`.replace(/، /g, lang === 'ar' ? '، ' : ', ');
  return `<svg class="target-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}" xmlns="http://www.w3.org/2000/svg"><title>${title}</title>${ticks}${bars}</svg>`;
}

const modelDiagram = ariaLabel => `<svg class="model-diagram" viewBox="0 0 640 230" role="img" aria-label="${ariaLabel}" xmlns="http://www.w3.org/2000/svg">
<g class="dm-line"><path d="M180 115 H260"/><path d="M380 115 H460"/></g>
<g class="dm-card"><rect x="8" y="40" width="172" height="150" rx="3"/><text class="dm-name" x="22" y="68">Customers</text><text x="22" y="96">CustomerID</text><text x="22" y="120">CustomerName</text><text x="22" y="144">City</text></g>
<g class="dm-card dm-fact"><rect x="260" y="20" width="120" height="190" rx="3"/><text class="dm-name" x="274" y="48">Sales</text><text x="274" y="76">OrderID</text><text x="274" y="100">OrderDate</text><text x="274" y="124">CustomerID</text><text x="274" y="148">Amount</text></g>
<g class="dm-card"><rect x="460" y="20" width="172" height="190" rx="3"/><text class="dm-name" x="474" y="48">Date</text><text x="474" y="76">Date</text><text x="474" y="100">Year</text><text x="474" y="124">MonthNo · Month</text><text x="474" y="148">YearMonth</text><text x="474" y="172">Quarter</text></g>
<g class="dm-card-end"><text x="186" y="108">1</text><text x="244" y="108">∗</text><text x="392" y="108">∗</text><text x="446" y="108">1</text></g>
</svg>`;

function stepper(current, lang) {
  const T = TEXT[lang];
  const items = LEVELS.map(l => `<li data-level-id="${l.id}"${l.id === current.id ? ' aria-current="step"' : ''}><a href="${l.file}"><span class="dax-steps__n" aria-hidden="true">${l.level}</span><span class="dax-steps__text"><strong>${l[lang].name}</strong><small>${T.minutes(l.minutes)}</small></span><span class="dax-steps__state" data-state></span></a></li>`).join('');
  return `<nav class="dax-steps" aria-label="${T.stepsLabel}" data-dax-steps><ol>${items}</ol></nav>`;
}

function renderLevel(level, lang) {
  const T = TEXT[lang], L = level[lang], months = MONTHS[lang];
  const prefix = lang === 'ar' ? '../' : '';
  const target = JSON.parse(readFileSync(join(root, `assets/dax/data/${level.id}-target.json`), 'utf8'));
  const f = FORMATS[level.format];
  const ctxCol = T.ctxLabel[target.context.name] ?? target.context.label;
  const ctxValues = target.context.values;
  const rows = target.values.map((v, i) => `<tr><th scope="row">${months[i]} 2024</th><td>${ctxValues ? money(ctxValues[i]) : '–'}</td><td><strong>${ltr(f.cell(v))}</strong></td></tr>`).join('');
  const prev = LEVELS[level.level - 2], next = LEVELS[level.level];
  const formatLabel = T.formats[level.format];

  return `<div class="container dax-page">
<a class="text-link back-link" href="index.html"><span aria-hidden="true">${lang === 'ar' ? '→' : '←'}</span> ${T.back}</a>
${stepper(level, lang)}
<section class="case-hero dax-hero" aria-labelledby="dax-title">
  <div class="eyebrow">${L.eyebrow}</div>
  <h1 id="dax-title">${L.title}</h1>
  <p class="case-lead">${L.lead}</p>
  <div class="tags">${L.tags.map(t => `<span>${t}</span>`).join('')}</div>
  <div class="dax-counters" data-dax-stats hidden aria-label="${T.countersLabel}"><span><strong data-n="visitors">0</strong> ${T.counters[0]}</span><span><strong data-n="started">0</strong> ${T.counters[1]}</span><span><strong data-n="solved">0</strong> ${T.counters[2]}</span></div>
  <div class="hero-actions"><a class="button" href="#workspace">${T.start} <span aria-hidden="true">↓</span></a><a class="text-link" href="#leaderboard">${T.seeBoard} <span aria-hidden="true">↗</span></a></div>
</section>

<section class="dax-brief" aria-labelledby="brief-title">
  <div class="dax-brief__text">
    <h2 id="brief-title">${T.brief}</h2>
    <ul class="dax-rules">${L.rules.map(r => `<li>${r}</li>`).join('')}</ul>
    <p class="dax-note">${T.dataNote}</p>
    <p class="dax-downloads"><a href="${prefix}assets/dax/data/retention-sales.csv" download data-dax-download>Sales.csv</a><a href="${prefix}assets/dax/data/retention-customers.csv" download data-dax-download>Customers.csv</a><a href="${prefix}assets/dax/data/retention-date.csv" download data-dax-download>Date.csv</a></p>
  </div>
  <figure class="dax-model"><div class="dax-model-wrap" tabindex="0" role="region" aria-label="${T.modelTitle}">${modelDiagram(T.modelLabel)}</div><figcaption>${T.modelCaption}</figcaption></figure>
</section>

<section class="dax-target" aria-labelledby="target-title">
  <div class="section-heading"><div><div class="eyebrow">${T.target}</div><h2 id="target-title">${T.targetTitle}</h2></div><p>${L.heading} ${T.matchEvery}</p></div>
  <div class="dax-target__grid">
    <figure class="dax-chart"><div class="dax-chart-wrap" tabindex="0" role="region" aria-label="${T.chartCaption}">${targetChart(target.values, level.format, lang, formatLabel, T.chartTitle(formatLabel))}</div><figcaption>${T.chartCaption}</figcaption></figure>
    <div class="dax-table-wrap" tabindex="0" role="region" aria-label="${L.heading}"><table class="dax-table"><caption class="sr-only">${ctxCol}${T.tableCaption}</caption><thead><tr><th scope="col">${T.month}</th><th scope="col">${ctxCol}</th><th scope="col">${L.targetColumn}</th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>
</section>

<section class="dax-workspace" id="workspace" aria-labelledby="workspace-title">
  <div class="section-heading"><div><div class="eyebrow">${T.yourTurn}</div><h2 id="workspace-title">${T.write}</h2></div><p>${T.typeLike}</p></div>
  ${prev ? `<div class="dax-lock" data-dax-lock hidden role="status"><strong>${T.lockTitle(level.level)}</strong><p>${T.lockText(prev.level, prev[lang].name)}</p><a class="button" href="${prev.file}">${T.lockGo(prev.level)} <span aria-hidden="true">${lang === 'ar' ? '←' : '→'}</span></a></div>` : ''}
  <div class="dax-app" id="dax-app" data-challenge="${level.id}" data-model="${prefix}assets/dax/data/retention.json" data-target="${prefix}assets/dax/data/${level.id}-target.json"${prev ? ` data-requires="${prev.id}"` : ''}${next ? ` data-next-file="${next.file}" data-next-name="${T.nextLevel(next.level, next[lang].name)}"` : ''}>
    <noscript><p class="dax-note">${T.noscript}</p></noscript>
    <aside class="dax-fields" aria-label="${T.fields}" dir="ltr"><h3>${T.fields}</h3><div data-dax-fields></div></aside>
    <div class="dax-main">
      <div data-dax-editor></div>
      <div class="dax-actions">
        <button class="button" type="button" data-dax-run>${T.run} ▷</button>
        <button class="button secondary" type="button" data-dax-reset>${T.reset}</button>
        <span class="dax-run-status" data-dax-run-status role="status" aria-live="polite"></span>
      </div>
      <div class="dax-result" data-dax-result hidden>
        <div class="dax-result__head"><h3>${T.resultTitle}</h3><span class="dax-badge" data-dax-badge></span></div>
        <div data-dax-chart tabindex="0" role="region" aria-label="${T.chartCaption}"></div>
        <div class="dax-table-wrap" data-dax-compare></div>
      </div>
      <form class="dax-submit" data-dax-submit novalidate>
        <h3>${T.submitTitle}</h3>
        <p>${T.submitText}</p>
        <div class="dax-submit__row">
          <label>${T.yourName}<input name="name" autocomplete="nickname" maxlength="32" required placeholder="${T.namePlaceholder}"></label>
          <label>${T.linkedin} <small>${T.optional}</small><input name="linkedin" dir="ltr" inputmode="url" autocomplete="url" maxlength="140" placeholder="https://www.linkedin.com/in/…"></label>
        </div>
        <button class="button" type="submit" data-dax-submit-button>${T.submitButton}</button>
        <p class="dax-feedback" data-dax-feedback role="status" aria-live="polite"></p>
        <div class="dax-next" data-dax-next hidden></div>
        <p class="dax-note">${T.privacy}</p>
      </form>
    </div>
  </div>
  <details class="dax-data"><summary>${T.browseData}</summary><div data-dax-data class="dax-data__body" dir="ltr"></div></details>
</section>

<section class="dax-leaderboard" id="leaderboard" aria-labelledby="board-title">
  <div class="section-heading"><div><div class="eyebrow">${T.leaderboard(level.level)}</div><h2 id="board-title">${T.solvedIt}</h2></div><p>${T.boardText}</p></div>
  <div class="dax-table-wrap"><table class="dax-table dax-board"><thead><tr>${T.cols.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody data-dax-board><tr><td colspan="5" class="dax-empty">${T.loading}</td></tr></tbody></table></div>
</section>

<section class="dax-hints" aria-labelledby="hints-title">
  <h2 id="hints-title">${T.stuck}</h2>
  ${L.hints.map(([title, text], i) => `<details data-dax-hint="${i + 1}"><summary>${title}</summary><p>${text}</p></details>`).join('\n  ')}
  <p class="dax-note">${REVEAL_SOLUTION ? T.walkthroughOut : T.walkthroughSoon}</p>
</section>

<section class="dax-cta"><p>${T.cta}</p><a class="button secondary" href="index.html#contact">${T.ctaButton} <span aria-hidden="true">↗</span></a></section>
</div>`;
}

export function addDaxPages({ generated, layout }) {
  for (const lang of ['en', 'ar']) {
    const prefix = lang === 'ar' ? '../' : '';
    const head = `<link rel="stylesheet" href="${prefix}assets/dax/challenge.css"><script type="module" src="${prefix}assets/dax/challenge.js"></script>`;
    for (const level of LEVELS) {
      const T = TEXT[lang], L = level[lang];
      const path = lang === 'ar' ? `ar/${level.file}` : level.file;
      generated.set(path, layout({
        title: `${T.titlePrefix(level.level)}: ${L.title} | ${T.titleSuffix}`,
        description: L.description, path, prefix, lang, body: renderLevel(level, lang), head,
      }));
    }
  }
}

export const DAX_REWRITES = LEVELS.flatMap(l => [`${l.pretty} /${l.file} 200`, `/ar${l.pretty} /ar/${l.file} 200`]);
