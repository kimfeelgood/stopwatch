/**
 * 앱 평가 시스템 — Google Apps Script 백엔드
 *
 * ════════════════════════════════════════
 * 설치 방법 (반드시 순서대로!)
 * ════════════════════════════════════════
 * 1. Google 스프레드시트를 새로 만든다
 * 2. 메뉴 → 확장 프로그램 → Apps Script 클릭
 *    ※ script.google.com 에서 직접 만들면 안 됨! 반드시 시트에서 열기
 * 3. 이 파일의 내용을 통째로 붙여넣고 저장 (Ctrl+S)
 * 4. 상단 메뉴 → 배포 → 새 배포
 *    → 유형: 웹 앱 선택
 *    → 다음 사용자로 실행: 나 (본인 계정)
 *    → 액세스 권한: 모든 사용자 (익명 포함)  ← 반드시 이것으로!
 *    → 배포 클릭 → 권한 승인 → URL 복사
 * 5. rating.html 의 CONFIG.scriptUrl 에 붙여넣기
 *
 * ⚠️ '테스트 배포'가 아닌 '새 배포(프로덕션)'를 사용해야 합니다.
 * ⚠️ 코드 수정 후에는 '배포 관리 → 수정'으로 재배포 필요.
 *
 * [시트 구조] — 스크립트가 자동 생성함
 * 시트명: ratings
 * 열: timestamp | rater | appId | rating | comment
 */

const SHEET_NAME = 'ratings';
const HEADERS    = ['timestamp', 'rater', 'appId', 'rating', 'comment'];

function doGet(e) {
  try {
    const params = e.parameter || {};
    if (params.action === 'rate') return saveRating(params);
    if (params.action === 'ping') return jsonOut({ success: true, pong: true, time: new Date().toISOString() });
    return getAllRatings();
  } catch (err) {
    return jsonOut({ success: false, error: err.message, stack: err.stack });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData || {}).contents || '{}');
    if (body.action === 'rate') return saveRating(body);
    return getAllRatings();
  } catch (err) {
    return jsonOut({ success: false, error: err.message });
  }
}

function getAllRatings() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return jsonOut({ success: true, data: [] });

  const rows = values.slice(1)
    .filter(r => r[1] && r[2]) // rater, appId 둘 다 있어야
    .map(r => ({
      timestamp: r[0] instanceof Date ? r[0].getTime() : 0,
      rater:     String(r[1]),
      appId:     String(r[2]),
      rating:    Number(r[3]) || 0,
      comment:   r[4] ? String(r[4]) : ''
    }));

  return jsonOut({ success: true, data: rows });
}

function saveRating(params) {
  const rater   = String(params.rater   || '').trim();
  const appId   = String(params.appId   || '').trim();
  const rating  = Number(params.rating);
  const comment = String(params.comment || '').trim();

  if (!rater)         return jsonOut({ success: false, error: 'rater가 비어 있습니다.' });
  if (!appId)         return jsonOut({ success: false, error: 'appId가 비어 있습니다.' });
  if (!rating || rating < 1 || rating > 5)
                      return jsonOut({ success: false, error: 'rating은 1~5 사이여야 합니다.' });

  const sheet  = getSheet();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]) === rater && String(values[i][2]) === appId) {
      sheet.getRange(i + 1, 1, 1, 5).setValues([[new Date(), rater, appId, rating, comment]]);
      return jsonOut({ success: true, action: 'updated' });
    }
  }

  sheet.appendRow([new Date(), rater, appId, rating, comment]);
  return jsonOut({ success: true, action: 'created' });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error(
    '스프레드시트를 찾을 수 없습니다. ' +
    'script.google.com이 아닌 Google 스프레드시트 메뉴 → 확장 프로그램 → Apps Script 에서 실행하세요.'
  );

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    const hdr = sheet.getRange(1, 1, 1, HEADERS.length);
    hdr.setBackground('#6C63FF').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setColumnWidths(1, 5, 0); // auto-resize
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 80);
    sheet.setColumnWidth(4, 60);
    sheet.setColumnWidth(5, 320);
  }
  return sheet;
}

function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
