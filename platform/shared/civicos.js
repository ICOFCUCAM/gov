// CivicOS — small shared client helpers.
// No tracking. No analytics. No third-party calls. No fingerprinting.
// Pure DOM utilities for the static prototypes.

(function () {
  'use strict';

  // Language switcher — locale-aware date formatting.
  const LANGS = {
    en: { name: 'English', dir: 'ltr' },
    sw: { name: 'Kiswahili', dir: 'ltr' },
    ar: { name: 'العربية', dir: 'rtl' },
    fr: { name: 'Français', dir: 'ltr' },
    yo: { name: 'Yorùbá', dir: 'ltr' }
  };

  function setLang(code) {
    if (!LANGS[code]) return;
    document.documentElement.lang = code;
    document.documentElement.dir = LANGS[code].dir;
    try { localStorage.setItem('civicos:lang', code); } catch (_) {}
  }

  function getLang() {
    try { return localStorage.getItem('civicos:lang') || 'en'; } catch (_) { return 'en'; }
  }

  // Format date in a locale-aware way; default to user's preferred calendar.
  function fmtDate(d, lang) {
    lang = lang || getLang();
    try {
      return new Intl.DateTimeFormat(lang, {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }).format(d);
    } catch (_) {
      return d.toDateString();
    }
  }

  // Toast-style microcopy hint (non-modal, dismissable, no auto-tracking).
  function announce(msg) {
    let region = document.getElementById('aria-live');
    if (!region) {
      region = document.createElement('div');
      region.id = 'aria-live';
      region.setAttribute('aria-live', 'polite');
      region.className = 'sr-only';
      document.body.appendChild(region);
    }
    region.textContent = msg;
  }

  // Tab navigation: simple anchor-based; no router.
  function setActiveTab() {
    const here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.tabbar a').forEach(a => {
      const href = a.getAttribute('href');
      if (href === here) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  // Contestation flow — three-step.
  function openContestation(receiptId) {
    const dlg = document.getElementById('contest-dialog');
    if (!dlg) return;
    dlg.dataset.receipt = receiptId;
    dlg.showModal();
    announce('Question this decision form opened.');
  }

  // Submit contestation (local-only in this prototype).
  function submitContestation(form) {
    const data = new FormData(form);
    const receiptId = form.closest('dialog').dataset.receipt;
    const reason = data.get('reason') || '(no reason given)';
    const note = data.get('note') || '';
    const caseId = 'C-' + Math.floor(7000 + Math.random() * 2999);
    const confirmation = document.getElementById('contest-confirmation');
    if (confirmation) {
      confirmation.querySelector('[data-slot="case"]').textContent = caseId;
      confirmation.querySelector('[data-slot="receipt"]').textContent = receiptId;
      confirmation.querySelector('[data-slot="reason"]').textContent = reason;
      confirmation.classList.remove('hide');
    }
    // Pretend persist to the local Audit Vault.
    try {
      const log = JSON.parse(localStorage.getItem('civicos:contests') || '[]');
      log.push({ caseId, receiptId, reason, note, ts: new Date().toISOString() });
      localStorage.setItem('civicos:contests', JSON.stringify(log));
    } catch (_) {}
    announce('Submitted. Case ' + caseId + ' opened.');
  }

  // Officer signature ceremony (mock — biometric+token confirm).
  function signDecision(opts) {
    const { decisionId, officerName, summary } = opts;
    const ts = new Date().toISOString();
    try {
      const log = JSON.parse(localStorage.getItem('civicos:signatures') || '[]');
      log.push({ decisionId, officerName, summary, ts });
      localStorage.setItem('civicos:signatures', JSON.stringify(log));
    } catch (_) {}
    announce('Decision ' + decisionId + ' signed by ' + officerName + '.');
  }

  // Public API
  window.CivicOS = {
    LANGS, setLang, getLang, fmtDate,
    announce, setActiveTab, openContestation, submitContestation, signDecision
  };

  // Initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    setLang(getLang());
    setActiveTab();
    // Render any [data-date] elements.
    document.querySelectorAll('[data-date]').forEach(el => {
      const d = new Date(el.dataset.date);
      if (!isNaN(d)) el.textContent = fmtDate(d);
    });
  });
})();
