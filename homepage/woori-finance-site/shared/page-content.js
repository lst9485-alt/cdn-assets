// 각 페이지별 콘텐츠 데이터 (모든 버전이 공유)
window.PAGE_CONTENT = {
  main: {
    hero: {
      eyebrow: "후회 없는 내집마련",
      title: "지금 여기,\n사도 될까요?",
      subtitle: "예산·대출·지역까지 1:1로 검토해드립니다. 25%에게는 \"지금 사지 마세요\"라고 말씀드립니다.",
      buttons: [
        { label: "1:1 코칭 신청 →", href: "coaching.html" },
        { label: "커리큘럼 보기", href: "curriculum.html" }
      ]
    },
    stats: [
      { n: "100++", l: "1:1 상담 진행" },
      { n: "4.97/5", l: "평균 만족도" },
      { n: "10년+", l: "투자업계 경력" },
      { n: "90일", l: "코칭 후 케어" }
    ],
    services: [
      { id: "coaching", title: "1:1 코칭", desc: "예산·지역·매물까지, 화상 50분 + 90일 카톡 케어", price: "40만원~", href: "coaching.html" },
      { id: "curriculum", title: "기초 커리큘럼", desc: "내집마련의 모든 것 — 단계별 무료 가이드", price: "무료", href: "curriculum.html" },
      { id: "lecture", title: "올인원 강의", desc: "내집마련 A to Z, 평생 다시보기 + 오픈채팅", price: "29만원", href: "lecture.html" },
      { id: "bookclub", title: "독서모임", desc: "한 달에 한 권, 함께 읽고 함께 사이좋게 부자되기", price: "월 5만원", href: "bookclub.html" }
    ]
  },
  coaching: {
    hero: {
      eyebrow: "1:1 맞춤 코칭",
      title: "당신의 상황에\n맞는 답을 드립니다",
      subtitle: "예산·대출 한도·생활 패턴까지 분석해 \"지금 어떻게 해야 하는지\" 명확하게 알려드립니다.",
      buttons: [{ label: "지금 신청하기 →", href: "#apply" }]
    },
    process: [
      { title: "신청서 제출", desc: "기본 정보 + 예산 + 관심 지역" },
      { title: "결제 확인 (12시간 내)", desc: "사전질문지 안내" },
      { title: "사전질문지 작성", desc: "코칭의 핵심 — 시간 들여 작성" },
      { title: "코칭 일정 확정", desc: "카톡으로 일정 조율" },
      { title: "Google Meet 50분 코칭", desc: "부부 동반 가능" },
      { title: "리포트 + 90일 케어", desc: "상담 리포트 + PDF + 카톡 질의응답" }
    ]
  },
  curriculum: {
    hero: {
      eyebrow: "무료 커리큘럼",
      title: "내집마련 4단계,\n순서대로만 따라오세요",
      subtitle: "유튜브 + 블로그 + 뉴스레터로 단계별 무료 학습. 처음부터 차근차근.",
      buttons: [{ label: "1단계부터 시작하기 →", href: "#step1" }]
    },
    steps: [
      { title: "마인드셋", desc: "왜 내집마련인가? 잃지 않는 투자의 출발점", bullets: ["전세 vs 매수의 진짜 차이", "기회비용과 위험비용", "가족과의 의사결정"] },
      { title: "자산 진단", desc: "내 현재 자산과 대출 한도 정확히 파악", bullets: ["DSR/DTI 계산법", "현금흐름 점검", "예산 시뮬레이션"] },
      { title: "지역 선정", desc: "내 예산에서 가능한 지역 좁히기", bullets: ["호재·악재 분석", "교통/학군/직주근접", "수도권 vs 광역시"] },
      { title: "매물 검토 → 매수", desc: "임장 → 비교 → 계약", bullets: ["임장 체크리스트", "계약서 함정", "매수 타이밍"] }
    ]
  },
  lecture: {
    hero: {
      eyebrow: "올인원 강의",
      title: "내집마련 A to Z,\n평생 다시보기",
      subtitle: "32강, 총 14시간. 한 번 결제로 평생 시청 + 수강생 전용 오픈채팅.",
      buttons: [{ label: "29만원에 시작하기 →", href: "#buy" }]
    },
    chapters: [
      { ch: "Ch.01", title: "마인드셋과 기초 (4강)", time: "1시간 30분" },
      { ch: "Ch.02", title: "자산 진단과 자금 계획 (5강)", time: "2시간 10분" },
      { ch: "Ch.03", title: "지역 분석 — 수도권 (6강)", time: "2시간 50분" },
      { ch: "Ch.04", title: "지역 분석 — 광역시 (4강)", time: "1시간 50분" },
      { ch: "Ch.05", title: "매물 분석과 임장 (5강)", time: "2시간 20분" },
      { ch: "Ch.06", title: "계약·잔금·등기 (4강)", time: "1시간 40분" },
      { ch: "Ch.07", title: "매수 후 자산관리 (4강)", time: "1시간 30분" }
    ],
    perks: [
      { title: "평생 다시보기", desc: "한 번 결제로 모든 강의 평생 시청" },
      { title: "수강생 오픈채팅", desc: "동기들과 함께 공부하고 정보 공유" },
      { title: "월 1회 라이브 Q&A", desc: "수강생만 참여하는 라이브 질의응답" },
      { title: "강의 자료 PDF", desc: "강의에서 사용한 모든 자료 다운로드" }
    ]
  },
  bookclub: {
    hero: {
      eyebrow: "월간 독서모임",
      title: "한 달에 한 권,\n함께 읽고 부자되기",
      subtitle: "매월 부동산·재테크 책 1권 선정. 온라인 모임 + 인사이트 노트 공유.",
      buttons: [{ label: "이번 달 가입 신청 →", href: "#join" }]
    },
    schedule: [
      { week: "1주차", title: "도서 발표", desc: "이번 달 책 + 핵심 질문 공유" },
      { week: "2주차", title: "혼자 읽기", desc: "각자 읽고 인사이트 노트 작성" },
      { week: "3주차", title: "토론 모임", desc: "Zoom 90분 — 핵심 챕터 토론" },
      { week: "4주차", title: "확장 자료", desc: "관련 영상·기사·차트 큐레이션" }
    ],
    books: [
      { month: "01월", title: "부의 인문학", note: "부동산을 넘어 자산의 본질" },
      { month: "02월", title: "돈의 심리학", note: "투자 의사결정의 함정" },
      { month: "03월", title: "부동산 트렌드 2026", note: "올해 시장의 큰 그림" },
      { month: "04월", title: "월급쟁이 부자로 은퇴하라", note: "현실적인 단계별 전략" }
    ]
  },
  refund: {
    hero: {
      eyebrow: "환불 규정",
      title: "투명하고\n예측 가능한 정책",
      subtitle: "어떤 경우에 환불이 가능한지 미리 분명하게 안내드립니다."
    },
    rules: [
      { service: "1:1 코칭", before: "사전질문지 안내 전: 100% 환불", during: "사전질문지 안내 후 ~ 코칭 24시간 전: 50% 환불", after: "코칭 24시간 이내 또는 코칭 후: 환불 불가" },
      { service: "올인원 강의", before: "결제 후 7일 이내, 강의 1개 미만 수강 시: 100% 환불", during: "강의 1~3개 수강: 50% 환불", after: "강의 4개 이상 수강 또는 30일 경과: 환불 불가" },
      { service: "독서모임", before: "월 시작 7일 전: 100% 환불", during: "월 시작 후 ~ 1주차 전: 50% 환불", after: "1주차 모임 시작 후: 환불 불가" }
    ],
    notes: [
      "환불은 결제 수단(카드/계좌)으로 영업일 기준 3~7일 내 처리됩니다.",
      "동행임장(코칭 B)은 일정 확정 후 7일 이전 취소만 50% 환불 가능합니다.",
      "천재지변, 본인 또는 직계가족의 사고·중병 등 부득이한 사유는 증빙 시 별도 협의합니다.",
      "환불 신청은 카카오 채널 또는 이메일로 접수해 주세요."
    ]
  }
};
