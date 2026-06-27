/**
 * 앱 평가 시스템 — Google Apps Script 백엔드
 *
 * [설치 방법]
 * 1. Google 스프레드시트를 새로 만든다
 * 2. 메뉴 → 확장 프로그램 → Apps Script 클릭
 * 3. 이 파일의 내용을 통째로 붙여넣고 저장 (Ctrl+S)
 * 4. 배포 → 새 배포 → 유형: 웹 앱
 *    - 다음 사용자로 실행: 나 (본인 계정)
 *    - 액세스 권한: 모든 사용자 (익명 포함)
 * 5. 배포 URL (https://script.google.com/macros/s/.../exec) 복사
 * 6. rating.html 의 CONFIG.scriptUrl 에 붙여넣기
 *
 * [시트 구조] — 스크립트가 자동 생성함
 * 시트명: ratings
 * 열: timestamp | rater | appId | rating | comment
 */

const SHEET_NAME = 'ratings';
const HEADERS    = ['timestamp', 'rater', 'appId', 'rating', 'comment'];

// GET 요청 처리 (읽기 + 쓰기 모두 GET으로 처리 — CORS 호환)
function doGet(e) {
  try {
    const action = (e.parameter || {}).action;
    if (action === 'rate') {
      return saveRating(e.parameter);
    }
    return getAllRatings();
  } catch (err) {
    return jsonOut({ success: false, error: err.message });
  }
}

// POST 요청도 동일하게 처리 (호환성)
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'rate') return saveRating(body);
    return getAllRatings();
  } catch (err) {
    return jsonOut({ success: false, error: err.message });
  }
}

// 전체 평가 조회
function getAllRatings() {
  const sheet = getOrCreateSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return jsonOut({ success: true, data: [] });

  const rows = values.slice(1).map(r => ({
    timestamp: r[0] ? new Date(r[0]).getTime() : 0,
    rater:     r[1],
    appId:     r[2],
    rating:    Number(r[3]),
    comment:   r[4] || ''
  }));

  return jsonOut({ success: true, data: rows });
}

// 평가 저장 (신규 추가 or 기존 수정)
function saveRating(params) {
  const rater   = params.rater   || '';
  const appId   = params.appId   || '';
  const rating  = Number(params.rating);
  const comment = params.comment || '';

  if (!rater || !appId || !rating) {
    return jsonOut({ success: false, error: 'rater, appId, rating은 필수입니다.' });
  }

  const sheet  = getOrCreateSheet();
  const values = sheet.getDataRange().getValues();

  // 동일 rater + appId 행이 있으면 덮어쓰기
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === rater && values[i][2] === appId) {
      sheet.getRange(i + 1, 1, 1, 5).setValues([[new Date(), rater, appId, rating, comment]]);
      return jsonOut({ success: true, action: 'updated' });
    }
  }

  // 없으면 새 행 추가
  sheet.appendRow([new Date(), rater, appId, rating, comment]);
  return jsonOut({ success: true, action: 'created' });
}

// 시트 가져오기 (없으면 자동 생성)
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    // 헤더 스타일
    const header = sheet.getRange(1, 1, 1, HEADERS.length);
    header.setBackground('#6C63FF').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setColumnWidth(1, 160); // timestamp
    sheet.setColumnWidth(2, 100); // rater
    sheet.setColumnWidth(3, 80);  // appId
    sheet.setColumnWidth(4, 60);  // rating
    sheet.setColumnWidth(5, 300); // comment
  }
  return sheet;
}

function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
