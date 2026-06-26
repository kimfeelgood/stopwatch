/**
 * 강의 만족도 평가 - Google Sheets 백엔드 (Apps Script)
 *
 * 사용법은 FEEDBACK_SETUP.md 참고.
 *  - 참가자 제출(POST)은 누구나 가능
 *  - 결과 조회(GET, action=list)는 ADMIN_PASSWORD 가 맞아야만 가능
 */

// ▼▼▼ 관리자(강사) 비밀번호를 여기서 바꾸세요 ▼▼▼
const ADMIN_PASSWORD = '1234';
// ▲▲▲

const SHEET_NAME = 'feedback';

/** 참가자 평가 제출 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet();
    sheet.appendRow([
      new Date(),
      Number(data.rating) || 0,
      String(data.name || '').slice(0, 40),
      String(data.comment || '').slice(0, 300)
    ]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** 관리자 결과 조회 (비밀번호 검증) */
function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.action !== 'list') {
    return json({ ok: false, error: 'bad_request' });
  }
  if (params.pw !== ADMIN_PASSWORD) {
    return json({ ok: false, error: 'unauthorized' });
  }

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues(); // 0번째 행은 헤더
  const items = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0] && !row[1]) continue; // 빈 행 건너뜀
    items.push({
      createdAt: row[0] ? new Date(row[0]).toISOString() : '',
      rating: Number(row[1]) || 0,
      name: row[2] || '',
      comment: row[3] || ''
    });
  }
  items.reverse(); // 최신순
  return json({ ok: true, items: items });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['시간', '별점', '이름', '한줄평']);
  }
  return sheet;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
