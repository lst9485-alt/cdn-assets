// 공통 디자인 시스템 — 6개 버전의 컬러/폰트/스타일 토큰
window.DS = {
  v1: {
    name: "Editorial Magazine",
    bg: "#FFF8E7", surface: "#FFFFFF", ink: "#1A2B47", muted: "rgba(26,43,71,0.6)",
    accent: "#FF6B5B", accent2: "#F4C430", accent3: "#4ECDC4",
    fontHead: "'Pretendard', sans-serif", fontBody: "'Pretendard', sans-serif",
    radius: 12, border: "2px solid #1A2B47"
  },
  v2: {
    name: "Sticker Collage",
    bg: "#FFF8E7", surface: "#FFFFFF", ink: "#1A2B47", muted: "rgba(26,43,71,0.6)",
    accent: "#FF6B5B", accent2: "#F4C430", accent3: "#4ECDC4",
    fontHead: "'Pretendard', sans-serif", fontBody: "'Pretendard', sans-serif",
    radius: 16, border: "2px dashed #1A2B47"
  },
  v3: {
    name: "Data Story",
    bg: "#FAFAF7", surface: "#FFFFFF", ink: "#0E1729", muted: "rgba(14,23,41,0.6)",
    accent: "#FF6B5B", accent2: "#F4C430", accent3: "#4ECDC4",
    fontHead: "'Pretendard', sans-serif", fontBody: "'Pretendard', sans-serif",
    radius: 12, border: "1px solid rgba(14,23,41,0.1)"
  },
  v4: {
    name: "Neighborhood Map",
    bg: "#E8F4EE", surface: "#FFF8E7", ink: "#1A2B47", muted: "rgba(26,43,71,0.6)",
    accent: "#FF6B5B", accent2: "#F4C430", accent3: "#4ECDC4",
    fontHead: "'Pretendard', sans-serif", fontBody: "'Pretendard', sans-serif",
    radius: 12, border: "3px solid #1A2B47"
  },
  v5: {
    name: "Kakao Chat",
    bg: "#FFF8E7", surface: "#FFFFFF", ink: "#1A2B47", muted: "rgba(26,43,71,0.6)",
    accent: "#FEE500", accent2: "#FF6B5B", accent3: "#4ECDC4",
    fontHead: "'Pretendard', sans-serif", fontBody: "'Pretendard', sans-serif",
    radius: 16, border: "1px solid rgba(26,43,71,0.1)"
  },
  v6: {
    name: "Risograph Zine",
    bg: "#FFE9C8", surface: "#FFE9C8", ink: "#2A1F1A", muted: "rgba(42,31,26,0.6)",
    accent: "#FF4D2D", accent2: "#FCEE21", accent3: "#1A2B47",
    fontHead: "'Pretendard', sans-serif", fontBody: "'Pretendard', sans-serif",
    radius: 0, border: "4px solid #2A1F1A"
  }
};

// 공통 콘텐츠 데이터
window.CONTENT = {
  brand: "우리동네재테크",
  tagline: "후회 없는 내집마련 1:1 코칭",
  bigQuestion: "지금 여기 사도 될까요?",
  stats: [
    { n: "100++", l: "1:1 상담 진행" },
    { n: "4.97", l: "5점 만점 만족도" },
    { n: "10년+", l: "투자업계 경력" },
    { n: "90일", l: "코칭 후 케어" }
  ],
  pricing: {
    a: { name: "코칭 A", price: 400000, original: 500000, items: ["온라인 화상회의 약 50분", "코칭 후 최대 90일간 질의응답", "부부동반 가능", "하루 1명만 진행", "상담 리포트 + 자산관리시트 + 체크리스트 PDF"] },
    b: { name: "코칭 B", price: 960000, original: 1200000, items: ["코칭 A 전체 포함", "+ 동행임장 1회", "매월 선착순 2명만 진행"] }
  },
  reviews: [
    { who: "박*현", region: "서울 송파 30대 · 맞벌이", quote: "부동산 상담은 우재님이 처음이었는데 너무 만족스러웠습니다!", detail: "부동산 구입이라는 큰 의사결정을 하는 데 전문가의 도움을 받아서 나쁠 건 없다는 생각이 들어서 신청했습니다" },
    { who: "오*미", region: "인천 40대 · 부부", quote: "남편이 의심이 많은데 너무 만족해서 주말에 바로 부동산 보고 왔네요", detail: "상담 시간이 오바되었는데도 전혀 내색없이 마지막까지 성심성의껏 상담 해주셨습니다" },
    { who: "원*호", region: "분당 20대 · 사회초년생", quote: "앞으로 어떻게 해야 할지 자세하게 알려주셨습니다", detail: "부린이로써 모르는 부분까지 자세하게 알려주셔서 유익했습니다" },
    { who: "안*지", region: "수도권 30대 · 결혼예정", quote: "할 수 있다는 자신감이 생겼습니다", detail: "가족을 생각하며 막연히 자산을 늘리고 싶었는데 무엇부터 해야 할지 현실적인 방향을 잡았습니다" },
    { who: "한*솔", region: "용인 30대 · 생애최초", quote: "생애 첫 매매인데 어떻게 접근해야 될지 갈피가 잡혔습니다", detail: "갈피를 못 잡던 와중에 유익한 답변을 해주셨습니다" },
    { who: "장*영", region: "청주 30대 · 맞벌이", quote: "알려주신 방향을 따라가도록 잘 참고하겠습니다", detail: "저희 둘만 고민했을 때보다 시야가 더 트인것 같아서 도움이 많이 되었습니다" },
    { who: "송*연", region: "일산 30대 · 맞벌이", quote: "돈 아깝지 않은 상담이었습니다", detail: "상담비가 아깝지 않을 정도로 알찬 정보를 주셨습니다" },
    { who: "김*영", region: "전주 30대 · 신혼부부", quote: "예산에 맞는 최적의 지역을 추천받았습니다", detail: "내 예산에서 가능한 선택지를 명확하게 정리해주셨습니다" },
    { who: "최*지", region: "수도권 30대 · 부부", quote: "처음인데도 이해하기 쉽게 잡아주셨습니다", detail: "부동산을 잘 모르는 저희 부부에게 친절하게 설명해주셔서 첫 결정에 대한 불안이 줄었습니다" },
    { who: "양*혁", region: "창원 30대 · 직장인", quote: "상담 하나로 수천만원을 아꼈습니다", detail: "위험한 매물을 피할 수 있었습니다. 진짜 감사합니다" },
    { who: "조*민", region: "파주 30대 · 맞벌이", quote: "90일 질의응답이 진짜 큽니다", detail: "상담 끝나고도 카톡으로 계속 물어볼 수 있어서 안심됩니다" },
    { who: "문*준", region: "제주 30대 · 직장인", quote: "로드맵이 너무 명확해서 바로 실행했습니다", detail: "상담 후 받은 액션플랜대로 움직이니까 결과가 나왔습니다" },
    { who: "윤*아", region: "부산 30대 · 싱글", quote: "솔직히 반신반의했는데, 코칭 후 확신이 생겼습니다", detail: "반신반의하며 상담을 신청했는데 명확한 투자 방향을 잡을 수 있었습니다" }
  ],
  faqs: [
    { q: "코칭을 통해 어떤 도움을 받을 수 있나요?", a: "신청자의 예산, 대출 한도, 생활 패턴을 분석하여 맞춤형 내집마련 로드맵을 제시합니다.\n• 예산·대출 분석 → 실현 가능한 자금 계획\n• 지역·단지 선정 → 가장 적합한 추천지 제공\n• 매물 비교·검토 → 어떤 물건이 더 나은지 판단 기준 제시\n• 매수 의사결정 지원 → 사야 하는지, 말아야 하는지 명확한 답변\n• 코칭 후 최대 90일간 질의응답\n실제 신청자 중 약 25%에게는 \"지금 매수하지 마세요\"라고 말씀드립니다." },
    { q: "코칭 신청은 언제 하는 게 좋을까요?", a: "내집마련을 고민하기 시작했을 때가 가장 좋은 타이밍입니다.\n• 예산이 적어도, 아직 구체적 계획이 없어도 상관없습니다\n• 초기에 방향을 잡아야 시행착오가 줄어듭니다\n• 매수 직전뿐 아니라, 1~2년 뒤 계획인 분들도 많이 코칭을 받으십니다" },
    { q: "지금 사는 게 맞는지 잘 모르겠어요.", a: "실제 신청자 중 약 25%는 \"매수하지 말라\"고 말씀드립니다. \"사세요/사지 마세요\"로 끝나는 게 아니라, 어떤 상황이든 다음 단계가 명확해지도록 도와드립니다." },
    { q: "특정 지역, 아파트를 추천해 주시나요?", a: "물론입니다. 예산과 상황에 맞는 지역·단지를 함께 분석합니다. 다만, 무조건 내집마련이나 아파트 매수만 고집하지는 않습니다. 때로는 \"지금은 ETF에 집중하고, 1년 후 매수하세요\"라는 답변을 드리기도 합니다." },
    { q: "자산이 적어도 코칭이 가능할까요?", a: "자산 5천만원 미만으로 코칭을 받으시는 분들도 많습니다. 자금이 적을수록 초기 방향 설정이 더 중요합니다." },
    { q: "코칭 A와 B의 차이는 무엇인가요?", a: "동행임장 1회 제외, 모두 동일합니다.\n• 코칭 A (400,000원): 온라인 화상 코칭 약 50분 + 최대 90일 질의응답 + 상담 리포트 + 자산관리시트 + 체크리스트 PDF\n• 코칭 B (960,000원): 코칭 A 전체 + 동행임장 1회\n코칭 B는 매월 선착순 2명만 진행합니다." },
    { q: "코칭은 어떻게 진행되나요?", a: "1. 신청서 제출\n2. 신청 완료 화면에서 카드결제 또는 계좌이체 선택\n3. 결제·입금 확인 후 12시간 내 사전질문지 안내\n4. 사전질문지 작성\n5. 카카오톡으로 코칭 일정 확정\n6. Google Meet 온라인 1:1 코칭 약 50분 (부부동반 가능)\n7. 상담 리포트 및 자료 수령\n8. 코칭 후 최대 90일 카카오톡 질의응답" },
    { q: "코칭을 꼭 받아야 하나요?", a: "아닙니다. 유튜브 영상만으로도 충분히 공부하실 수 있습니다. 다만, 영상은 일반적인 내용이고 코칭은 \"내 상황\"에 맞춘 답변입니다. 잘못된 선택 한 번이 수천만~수억 차이를 만들기 때문에, 중요한 결정 앞에서 전문가 의견을 듣는 것을 추천드립니다." },
    { q: "코칭 이후에도 도움을 받을 수 있나요?", a: "네. 코칭 후 최대 90일간 카카오톡으로 물건비교, 계약, 질의응답을 무제한 지원합니다." },
    { q: "혼자 준비할 때와 어떤 차이가 있을까요?", a: "혼자 준비하면 \"내가 모르는 걸 모릅니다.\"\n• 검색으로 찾은 정보는 편향되어 있을 수 있습니다\n• 부동산 중개사는 거래 성사가 목적이라 객관적이지 않을 수 있습니다" }
  ],
  pages: [
    { id: "main", file: "main.html", label: "홈" },
    { id: "coaching", file: "coaching.html", label: "1:1 코칭" },
    { id: "curriculum", file: "curriculum.html", label: "커리큘럼" },
    { id: "lecture", file: "lecture.html", label: "올인원 강의" },
    { id: "bookclub", file: "bookclub.html", label: "독서모임" },
    { id: "refund", file: "refund.html", label: "환불규정" }
  ],
  versions: [
    { id: "main-original", href: "../../main-page.html", displayId: "원본", displayName: "메인 페이지 원본", label: "메인" },
    { id: "preview-v00", href: "../../v00/index.html", displayId: "v00", displayName: "메인 페이지 시안 v00", label: "비교" },
    { id: "preview-v2", href: "../../main-page-test2.html", displayId: "v2", displayName: "메인 페이지 시안 v2", label: "WBF" },
    { id: "v1", displayId: "v3", displayName: "메인 페이지 시안 v3", label: "Editorial" },
    { id: "v2", displayId: "v4", displayName: "메인 페이지 시안 v4", label: "Sticker" },
    { id: "v3", displayId: "v5", displayName: "메인 페이지 시안 v5", label: "Data" },
    { id: "v4", displayId: "v6", displayName: "메인 페이지 시안 v6", label: "Map" },
    { id: "v5", displayId: "v7", displayName: "메인 페이지 시안 v7", label: "Chat" },
    { id: "v6", displayId: "v8", displayName: "메인 페이지 시안 v8", label: "Zine" }
  ]
};
