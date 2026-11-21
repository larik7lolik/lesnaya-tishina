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

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = parsePayload(e);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error('Скрипт не привязан к таблице: откройте её и создайте Apps Script через Расширения → Apps Script');
    }
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 160);
      sheet.setColumnWidth(3, 180);
    }

    sheet.appendRow([
      new Date(),
      String(data.name || ''),
      String(data.phone || ''),
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
      sheet: SHEET_NAME,
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
    ? 'Лесная Тишина — приём заявок активен\nТаблица: ' + ss.getUrl() + '\nЛист: ' + SHEET_NAME
    : 'Лесная Тишина — скрипт не привязан к таблице';
  return ContentService.createTextOutput(text);
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
