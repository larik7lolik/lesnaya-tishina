/* ==========================================================
   Форма заявки «Лесная Тишина» — чистый JS, без библиотек
   ========================================================== */
(() => {
  'use strict';

  const dialog = document.getElementById('bookingModal');
  const form = document.getElementById('hotelRequestForm');
  if (!dialog || !form) return;

  const fields = {
    name: form.elements.name,
    phone: form.elements.phone,
    checkin: form.elements.checkin,
    checkout: form.elements.checkout,
    comment: form.elements.comment,
    consent: form.elements.consent
  };
  const errors = {
    name: document.getElementById('rfNameError'),
    phone: document.getElementById('rfPhoneError'),
    checkin: document.getElementById('rfCheckinError'),
    checkout: document.getElementById('rfCheckoutError'),
    consent: document.getElementById('rfConsentError')
  };
  const success = document.getElementById('rfSuccess');
  const formError = document.getElementById('rfFormError');
  const submitButton = form.querySelector('[type="submit"]');
  const submitLabel = submitButton.textContent;
  const today = new Date().toISOString().slice(0, 10);

  /* URL веб-приложения Google Apps Script.
     Можно вставить сюда или в атрибут data-endpoint формы в index.html. */
  const SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyMAjZfodBdFiF5lGxnQf5WEZRBQLUGmPNQwjqqeNxm1nhcRw62fCaMAfC4F3m6vM2X/exec';
  const getEndpoint = () => form.dataset.endpoint || SHEETS_ENDPOINT;

  fields.checkin.min = today;
  fields.checkout.min = today;
  if (!fields.phone.value) fields.phone.value = '+7 ';

  /* Маска телефона: +7 (XXX) XXX-XX-XX */
  function formatPhone(value) {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    if (digits && !digits.startsWith('7')) digits = '7' + digits;
    digits = digits.slice(0, 11);
    const d = digits.slice(1);
    let out = '+7';
    if (d.length > 0) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += ' ' + d.slice(3, 6);
    if (d.length >= 6) out += '-' + d.slice(6, 8);
    if (d.length >= 8) out += '-' + d.slice(8, 10);
    return out;
  }

  function setError(key, message) {
    errors[key].textContent = message;
    fields[key].setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function clearError(key) {
    setError(key, '');
  }

  fields.phone.addEventListener('input', () => {
    fields.phone.value = formatPhone(fields.phone.value);
    fields.phone.setSelectionRange(fields.phone.value.length, fields.phone.value.length);
    clearError('phone');
  });
  fields.phone.addEventListener('focus', () => {
    if (!fields.phone.value) fields.phone.value = '+7 ';
  });

  fields.checkin.addEventListener('change', () => {
    fields.checkout.min = fields.checkin.value || today;
    clearError('checkin');
    if (fields.checkout.value && fields.checkout.value <= fields.checkin.value) clearError('checkout');
  });
  fields.checkout.addEventListener('change', () => clearError('checkout'));
  fields.name.addEventListener('input', () => clearError('name'));
  fields.consent.addEventListener('change', () => clearError('consent'));

  function validate() {
    let ok = true;

    if (fields.name.value.trim().length < 2) {
      setError('name', 'Укажите имя — минимум 2 символа');
      ok = false;
    } else clearError('name');

    const phoneDigits = fields.phone.value.replace(/\D/g, '');
    if (phoneDigits.length !== 11 || !phoneDigits.startsWith('7')) {
      setError('phone', 'Введите корректный номер телефона');
      ok = false;
    } else clearError('phone');

    if (!fields.checkin.value) {
      setError('checkin', 'Выберите дату заезда');
      ok = false;
    } else clearError('checkin');

    if (!fields.checkout.value) {
      setError('checkout', 'Выберите дату выезда');
      ok = false;
    } else if (fields.checkin.value && fields.checkout.value <= fields.checkin.value) {
      setError('checkout', 'Дата выезда должна быть позже даты заезда');
      ok = false;
    } else clearError('checkout');

    if (!fields.consent.checked) {
      setError('consent', 'Подтвердите согласие на обработку персональных данных');
      ok = false;
    } else clearError('consent');

    if (!ok) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
    }
    return ok;
  }

  async function sendToSheets() {
    const payload = {
      name: fields.name.value.trim(),
      phone: fields.phone.value,
      checkin: fields.checkin.value,
      checkout: fields.checkout.value,
      comment: fields.comment.value.trim(),
      consent: fields.consent.checked,
      source: window.location.hostname || 'file',
      sentAt: new Date().toISOString()
    };

    // no-cors нужен, чтобы Apps Script принял запрос без CORS-конфигурации.
    await fetch(getEndpoint(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload)
    });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    formError.textContent = '';
    if (!validate()) return;

    if (!getEndpoint()) {
      formError.textContent = 'Адрес приёма заявок не настроен. Вставьте URL веб-приложения Google Apps Script в form.js или в data-endpoint формы.';
      console.warn('[Лесная Тишина] Не задан endpoint Google Sheets.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Отправляем заявку…';
    try {
      await sendToSheets();
      form.hidden = true;
      success.hidden = false;
    } catch (error) {
      formError.textContent = 'Не удалось отправить заявку. Позвоните нам: +7 800 000-00-00';
      console.error('[Лесная Тишина] Ошибка отправки:', error);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = submitLabel;
    }
  });

  /* Сброс состояния при каждом открытии модалки */
  dialog.addEventListener('form:reset', () => {
    form.reset();
    form.hidden = false;
    success.hidden = true;
    formError.textContent = '';
    submitButton.disabled = false;
    submitButton.textContent = submitLabel;
    Object.keys(errors).forEach(clearError);
    fields.phone.value = '+7 ';
    fields.checkin.min = today;
    fields.checkout.min = today;
  });
})();
