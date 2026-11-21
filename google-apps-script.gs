/**
 * Лесная Тишина — приём заявок в Google Sheets.
 *
 * 1. Создайте Google Таблицу.
 * 2. Расширения → Apps Script, удалите что там есть, вставьте этот код.
 * 3. Сохраните, разверните: Развернуть → Новое развёртывание → Веб-приложение.
 *    «Кто имеет доступ»: Anyone / «Любой пользователь» (иначе браузер не сможет отправить).
 * 4. Скопируйте URL веб-приложения в form.js (SHEETS_ENDPOINT) или в data-endpoint формы.
 */

const SHEET_NAME = 'Заявки';
const HEADERS = ['Дата', 'Имя', 'Телефон', 'Заезд', 'Выезд', 'Комментарий', 'Согласие', 'Источник', 'IP'];

// Запасные значения на случай, если в редактор вставлена не вся версия файла.
function sheetName() {
  return typeof SHEET_NAME === 'undefined' ? 'Заявки' : SHEET_NAME;
}

function headers() {
  return typeof HEADERS === 'undefined'
    ? ['Дата', 'Имя', 'Телефон', 'Заезд', 'Выезд', 'Комментарий', 'Согласие', 'Источник', 'IP']
    : HEADERS;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = parsePayload(e);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error('Скрипт не привязан к таблице: откройте её и создайте Apps Script через Расширения → Apps Script');
    }
    let sheet = ss.getSheetByName(sheetName());

    if (!sheet) {
      sheet = ss.insertSheet(sheetName());
      sheet.appendRow(headers());
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 160);
      sheet.setColumnWidth(3, 180);
    }

    // Столбец C — телефон. Без текстового формата Google Sheets воспринимает
    // номер, начинающийся с «+», как формулу и показывает ошибку в ячейке.
    sheet.getRange('C:C').setNumberFormat('@');

    sheet.appendRow([
      new Date(),
      String(data.name || ''),
      textPhone(data.phone),
      String(data.checkin || ''),
      String(data.checkout || ''),
      String(data.comment || ''),
      data.consent ? 'Да' : 'Нет',
      String(data.source || ''),
      String(data.sentAt || '')
    ]);

    return jsonResponse({
      ok: true,
      spreadsheetUrl: ss.getUrl(),
      sheet: sheetName(),
      row: sheet.getLastRow()
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Проверка: откройте URL веб-приложения в браузере — увидите,
 * в какую именно таблицу и лист идут заявки.
 */
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const text = ss
    ? 'Лесная Тишина — приём заявок активен\nТаблица: ' + ss.getUrl() + '\nЛист: ' + sheetName()
    : 'Лесная Тишина — скрипт не привязан к таблице';
  return ContentService.createTextOutput(text);
}

/**
 * Апостроф перед номером заставляет Google Sheets хранить значение текстом,
 * а не формулой. Сам апостроф в ячейке не отображается.
 */
function textPhone(value) {
  return "'" + normalizePhone(value);
}

/** Приводит телефон к текстовому виду +7 (XXX) XXX-XX-XX. */
function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (digits && !digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);
  if (digits.length !== 11) return String(value || '');
  const d = digits.slice(1);
  let out = '+7';
  if (d.length > 0) out += ' (' + d.slice(0, 3);
  if (d.length >= 3) out += ')';
  if (d.length > 3) out += ' ' + d.slice(3, 6);
  if (d.length >= 6) out += '-' + d.slice(6, 8);
  if (d.length >= 8) out += '-' + d.slice(8, 10);
  return out;
}

/**
 * Одноразовое исправление уже записанных строк: запустите эту функцию
 * в редакторе Apps Script один раз, если в столбце «Телефон» были ошибки.
 */
function fixPhoneColumn() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss && ss.getSheetByName(sheetName());
  const last = sheet && sheet.getLastRow();
  if (!sheet || !last || last < 2) return;

  const range = sheet.getRange(2, 3, last - 1, 1);
  const formulas = range.getFormulas();
  const values = range.getValues();
  const fixed = formulas.map((row, i) => {
    const raw = row[0] || values[i][0] || '';
    return [textPhone(raw)];
  });

  range.setNumberFormat('@');
  range.setValues(fixed);
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) return e && e.parameter ? e.parameter : {};

  const raw = e.postData.contents;
  try {
    return JSON.parse(raw);
  } catch (ignored) {
    // Fallback для urlencoded-запросов
    const result = {};
    raw.split('&').forEach(pair => {
      const [key, value = ''] = pair.split('=');
      result[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    });
    return result;
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
