const isArabic = document.documentElement.lang === 'ar';
const contactText = isArabic ? {
  greeting: 'مرحبًا عمر،', service: 'الخدمة', name: 'الاسم', reply: 'بريد الرد',
  subject: 'استفسار عن مشروع', ready: 'المسودة جاهزة. افتحها في تطبيق البريد وراجعها قبل الإرسال. لو التطبيق لم يفتح، تواصل مع عمر مباشرة من عنوان البريد الموجود.',
  copied: 'تم نسخ عنوان البريد.', copyFailed: 'حدّد عنوان البريد وانسخه، أو استخدم رابط البريد مباشرة.'
} : {
  greeting: 'Hi Omar,', service: 'Service', name: 'Name', reply: 'Reply to',
  subject: 'Project enquiry', ready: 'Your draft is ready. Open it in your email app to review and send. If no email app opens, email Omar directly using the address alongside this form.',
  copied: 'Email address copied.', copyFailed: 'Select and copy the email address, or use the email link.'
};
const menuButton = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('#navigation');
if (menuButton && menu) {
  menuButton.hidden = false;
  menuButton.setAttribute('aria-expanded', 'false');
  function closeMenu() {
    menuButton.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  });
  menu.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); menuButton.focus(); }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);
}

const form = document.querySelector('[data-contact-form]');
if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name')).trim();
    const email = String(data.get('email')).trim();
    const service = String(data.get('service'));
    const message = String(data.get('message')).trim();
    const body = [contactText.greeting, '', message, '', contactText.service + ': ' + service, contactText.name + ': ' + name, contactText.reply + ': ' + email].join('\n');
    const link = document.querySelector('[data-email-draft]');
    link.href = 'mailto:' + form.dataset.recipient + '?subject=' + encodeURIComponent(contactText.subject + ' — ' + service) + '&body=' + encodeURIComponent(body);
    link.hidden = false;
    document.querySelector('[data-form-status]').textContent = contactText.ready;
    link.focus();
  });
}

const copyButton = document.querySelector('[data-copy-email]');
if (copyButton) {
  copyButton.addEventListener('click', async () => {
    const status = document.querySelector('[data-copy-status]');
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copyEmail);
      status.textContent = contactText.copied;
    } catch {
      status.textContent = contactText.copyFailed;
    }
  });
}

document.querySelectorAll('[data-video-button]').forEach(button => {
  button.addEventListener('click', () => {
    const container = button.closest('[data-video]');
    const frame = document.createElement('iframe');
    frame.src = button.dataset.videoButton;
    frame.title = button.dataset.videoTitle;
    frame.width = '504'; frame.height = '541';
    frame.allowFullscreen = true;
    frame.loading = 'lazy';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    container.replaceChildren(frame);
    frame.tabIndex = 0;
    frame.focus();
  });
});

// Enhance only after an observer exists. Static HTML and unsupported browsers stay visible.
const revealTargets = [...document.querySelectorAll('.reveal-on-scroll')];
if (revealTargets.length) {
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let revealObserver;
  const showAll = () => {
    revealObserver?.disconnect();
    document.documentElement.classList.remove('js-reveal-enabled');
    revealTargets.forEach(node => node.classList.add('is-revealed'));
  };
  const enhanceReveal = () => {
    if (motionPreference.matches || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }
    try {
      revealObserver?.disconnect();
      revealObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
      revealTargets.forEach(node => revealObserver.observe(node));
      document.documentElement.classList.add('js-reveal-enabled');
    } catch {
      showAll();
    }
  };
  enhanceReveal();
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) showAll();
    else enhanceReveal();
  });
}
