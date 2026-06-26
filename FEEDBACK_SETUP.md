# 강의 만족도 평가 페이지 설정

`feedback.html` 한 파일로 동작합니다. 참가자는 각자 휴대폰으로 별점(별 반개 단위)과
한줄평을 남기고, 강사(관리자)만 비밀번호로 평균 평점과 한줄평을 볼 수 있습니다.

각자 다른 휴대폰에서 남긴 평가를 한곳에 모으려면 공유 저장소가 필요합니다.
무료인 **Firebase Firestore** 를 사용합니다. (서버/백엔드 없이 동작)

## 설정 (10분, 한 번만)

1. https://console.firebase.google.com 접속 → **프로젝트 만들기**
2. 프로젝트 화면에서 웹 앱 추가 (`</>` 아이콘) → 앱 닉네임 입력 → 등록
3. 화면에 나오는 `firebaseConfig` 객체를 복사
4. 왼쪽 메뉴 **빌드 → Firestore Database** → **데이터베이스 만들기** (위치 선택 후 생성)
5. `feedback.html` 상단의 설정 부분을 채웁니다.
   - `LECTURE_TITLE` : 강의 제목
   - `ADMIN_PASSWORD` : 관리자 비밀번호 (기본값 `1234` → 꼭 바꾸세요)
   - `firebaseConfig` : 3번에서 복사한 값으로 교체

## Firestore 보안 규칙

Firestore Database → **규칙(Rules)** 탭에 아래를 붙여넣고 게시하세요.
누구나 평가를 **제출(create)** 할 수 있지만, 기존 글의 수정·삭제는 막습니다.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /feedback/{doc} {
      allow read: if true;       // 관리자 화면에서 결과를 읽기 위함
      allow create: if true;     // 참가자 제출 허용
      allow update, delete: if false;
    }
  }
}
```

> 참고: 관리자 비밀번호는 페이지 안에서만 확인하는 간단한 잠금입니다.
> 7명 내외의 소규모 강의용으로는 충분하지만, 민감한 데이터라면 Firebase
> Authentication 으로 강화할 수 있습니다.

## 사용법

- **참가자**: `feedback.html` 주소를 공유하면 별점 + 한줄평을 남깁니다. (한 기기당 1회, "다시 평가하기"로 재제출 가능)
- **관리자**: 페이지 하단 **관리자** 링크 → 비밀번호 입력 → 평균 평점과 모든 한줄평 확인.
  또는 주소 끝에 `#admin` 을 붙여 바로 접근.

## 배포

GitHub Pages 등 정적 호스팅에 올리면 됩니다. 별도 서버가 필요 없습니다.
