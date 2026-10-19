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
    const body = `Hi Omar,\n\n${message}\n\nService: ${service}\nName: ${name}\nReply to: ${email}`;
    const link = document.querySelector('[data-email-draft]');
    link.href = `mailto:${form.dataset.recipient}?subject=${encodeURIComponent(`Project enquiry — ${service}`)}&body=${encodeURIComponent(body)}`;
    link.hidden = false;
    document.querySelector('[data-form-status]').textContent = 'Your draft is ready. Open it in your email app to review and send. If no email app opens, email Omar directly using the address alongside this form.';
    link.focus();
  });
}

const copyButton = document.querySelector('[data-copy-email]');
if (copyButton) {
  copyButton.addEventListener('click', async () => {
    const status = document.querySelector('[data-copy-status]');
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copyEmail);
      status.textContent = 'Email address copied.';
    } catch {
      status.textContent = 'Select and copy the email address, or use the email link.';
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
