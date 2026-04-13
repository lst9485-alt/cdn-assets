(function() {
  window.DASHBOARD_SITE = {
    icons: {
      dash: '<svg width="20" height="20" viewBox="0 0 16 16"><rect rx="2" width="16" height="16" fill="#1F2937"/><rect x="2" y="8" width="3" height="6" rx="1" fill="#fff"/><rect x="6.5" y="4" width="3" height="10" rx="1" fill="#fff"/><rect x="11" y="6" width="3" height="8" rx="1" fill="#fff"/></svg>',
      business: '<svg width="20" height="20" viewBox="0 0 16 16"><rect rx="2" width="16" height="16" fill="#059669"/><path d="M4 12L4 8L6 8L6 12Z M7 12L7 6L9 6L9 12Z M10 12L10 4L12 4L12 12Z" fill="#fff"/></svg>',
      branding: '<svg width="20" height="20" viewBox="0 0 16 16"><rect rx="3" width="16" height="16" fill="#FF6B00"/><path d="M4 4h8v2H4zM4 7.5h5v1.5H4zM4 10.5h7v1.5H4z" fill="#fff" opacity=".9"/></svg>',
      yt: '<svg width="20" height="20" viewBox="0 0 16 16"><rect rx="3" width="16" height="16" fill="#FF0000"/><path d="M6.5 4.5L11.5 8L6.5 11.5Z" fill="#fff"/></svg>',
      crm: '<svg width="20" height="20" viewBox="0 0 16 16"><circle cx="5" cy="5.5" r="2.5" fill="#64748B"/><circle cx="11" cy="5.5" r="2.5" fill="#64748B"/><path d="M0 14c0-3 1.5-4.5 5-4.5s5 1.5 5 4.5" fill="#64748B" opacity=".8"/><path d="M6 14c0-3 1.5-4.5 5-4.5s5 1.5 5 4.5" fill="#64748B" opacity=".8"/></svg>',
      n8n: '<svg width="20" height="20" viewBox="0 0 16 16"><rect rx="2" width="16" height="16" fill="#EA4B71"/><text x="8" y="11.5" text-anchor="middle" fill="#fff" font-size="8" font-weight="800" font-family="sans-serif">n8n</text></svg>',
      web: '<svg width="20" height="20" viewBox="0 0 16 16"><rect rx="2" width="16" height="16" fill="#0077C8"/><circle cx="8" cy="8" r="5" fill="none" stroke="#fff" stroke-width="1.5"/><ellipse cx="8" cy="8" rx="2.5" ry="5" fill="none" stroke="#fff" stroke-width="1.2"/><line x1="3" y1="8" x2="13" y2="8" stroke="#fff" stroke-width="1.2"/></svg>',
      content: '<svg width="20" height="20" viewBox="0 0 16 16"><rect rx="2" width="16" height="16" fill="#1F2937"/><path d="M4 10L8 4L9 7L12 6L8 12L7 9Z" fill="#fff"/></svg>',
      tg: '<svg width="20" height="20" viewBox="0 0 16 16"><rect rx="3" width="16" height="16" fill="#F59E0B"/><path d="M8 3.2a2.7 2.7 0 0 0-2.7 2.7v1c0 .5-.2 1-.6 1.3l-.6.6c-.4.4-.1 1.2.5 1.2h6.8c.6 0 .9-.8.5-1.2l-.6-.6c-.4-.3-.6-.8-.6-1.3v-1A2.7 2.7 0 0 0 8 3.2Z" fill="#fff"/><circle cx="8" cy="12.2" r="1.2" fill="#fff"/></svg>',
      money: '<svg width="20" height="20" viewBox="0 0 16 16"><rect rx="2" width="16" height="16" fill="#1F2937"/><text x="8" y="12" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="sans-serif">₩</text></svg>',
      doc: '<svg width="20" height="20" viewBox="0 0 16 16"><rect rx="2" width="16" height="16" fill="#1F2937"/><rect x="4" y="3" width="8" height="10" rx="1" fill="#fff"/><rect x="5.5" y="5" width="5" height="1" rx=".5" fill="#1F2937"/><rect x="5.5" y="7.5" width="5" height="1" rx=".5" fill="#1F2937"/><rect x="5.5" y="10" width="3" height="1" rx=".5" fill="#1F2937"/></svg>',
      tool: '<svg width="20" height="20" viewBox="0 0 16 16"><rect rx="2" width="16" height="16" fill="#475569"/><path d="M10.8 4.2a2.5 2.5 0 0 0-3.1 3.1L4 11l1 1 3.7-3.7a2.5 2.5 0 0 0 3.1-3.1L10.4 6.6 9.4 5.6l1.4-1.4Z" fill="#fff"/></svg>'
    },
    sections: [
      {
        id: 'dashboard',
        hubTitle: '대시보드',
        nav: {
          type: 'dropdown',
          label: '대시보드',
          activeMatch: ['/dashboard']
        },
        sidebar: {},
        items: [
          {
            id: 'dashboard-main',
            title: '투두 · 프로젝트 · OKR',
            description: '크론잡 자동 갱신 (매일 06시)',
            href: 'dashboard/',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'dash',
            hubVisible: true,
            navVisible: true,
            sidebarType: 'root',
            activeMatch: ['dashboard']
          },
          {
            id: 'business',
            title: '사업현황',
            sidebarLabel: '사업현황',
            description: '전환 퍼널 + 병목 분석',
            href: 'dashboard/business.html',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'business',
            hubVisible: true,
            navVisible: true,
            sidebarType: 'root',
            activeMatch: ['business.html']
          },
          {
            id: 'branding',
            title: '00_브랜딩',
            sidebarLabel: '브랜딩',
            description: '채널 정체성 · 타겟 · 톤앤매너',
            href: 'dashboard/branding.html',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'branding',
            hubVisible: true,
            navVisible: true,
            sidebarType: 'root',
            activeMatch: ['branding.html']
          }
        ]
      },
      {
        id: 'homepage-section',
        hubTitle: '홈페이지',
        nav: {
          type: 'single',
          label: '홈페이지',
          href: 'homepage/',
          activeMatch: ['/homepage']
        },
        sidebar: {
          title: '홈페이지'
        },
        items: [
          {
            id: 'landing-page',
            title: '1:1 상담 랜딩페이지',
            description: '상세페이지 v3.5 미리보기',
            href: 'homepage/landing.html',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'web',
            sidebarType: 'root',
            activeMatch: ['landing.html'],
            hubVisible: true
          },
          {
            id: 'lecture-allinone',
            title: '올인원 강의 페이지',
            description: '내집마련 올인원 VOD · 20만원',
            href: 'homepage/lecture-allinone.html',
            badgeText: 'NEW',
            badgeTone: 'live',
            iconKey: 'doc',
            sidebarType: 'root',
            activeMatch: ['lecture-allinone.html'],
            hubVisible: true
          },
          {
            id: 'lecture-bookclub',
            title: '독서모임 페이지',
            description: '내집마련 독서모임 · 월 1회',
            href: 'homepage/lecture-bookclub.html',
            badgeText: 'NEW',
            badgeTone: 'live',
            iconKey: 'doc',
            sidebarType: 'root',
            activeMatch: ['lecture-bookclub.html'],
            hubVisible: true
          }
        ]
      },
      {
        id: 'process',
        hubTitle: '프로세스 도식화',
        nav: {
          type: 'dropdown',
          label: '프로세스',
          activeMatch: ['/process']
        },
        sidebar: {
          title: '프로세스'
        },
        items: [
          {
            id: 'youtube',
            title: '유튜브 제작',
            description: 'yt01~09 · 9단계',
            href: 'process/youtube.html',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'yt',
            navVisible: true,
            sidebarType: 'root',
            activeMatch: ['youtube.html'],
            hubVisible: true
          },
          {
            id: 'crm',
            title: 'CRM (상담)',
            navLabel: 'CRM 상담',
            sidebarLabel: 'CRM',
            description: '준비 8 + 후처리 5단계',
            href: 'process/crm.html',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'crm',
            navVisible: true,
            sidebarType: 'root',
            activeMatch: ['crm.html'],
            hubVisible: true
          },
          {
            id: 'n8n',
            title: 'n8n 워크플로우',
            navLabel: 'n8n',
            sidebarLabel: 'n8n',
            description: '자동화 연결도',
            href: 'process/n8n.html',
            badgeText: '틀만',
            badgeTone: 'soon',
            iconKey: 'n8n',
            navVisible: true,
            sidebarType: 'root',
            activeMatch: ['n8n.html'],
            hubVisible: true
          },
          {
            id: 'homepage',
            title: '홈페이지 제작',
            description: '기획→런칭 6단계',
            href: 'process/homepage.html',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'web',
            navVisible: true,
            sidebarType: 'root',
            activeMatch: ['homepage.html'],
            hubVisible: true
          },
          {
            id: 'content-marketing',
            title: '콘텐츠 마케팅',
            description: '키워드→분석 5단계',
            href: 'process/content-marketing.html',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'content',
            navVisible: true,
            sidebarType: 'root',
            activeMatch: ['content-marketing.html'],
            hubVisible: true
          },
          {
            id: 'telegram-alerts',
            title: '텔레그램 알림',
            description: '07시 · 하루4번 · 직접처리 · 문제알림',
            href: 'process/telegram-alerts.html',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'tg',
            navVisible: true,
            sidebarType: 'root',
            activeMatch: ['telegram-alerts.html'],
            hubVisible: true
          },
          {
            id: 'settlement',
            title: '회사정산',
            description: '매일 · 주간 · 월정산',
            href: 'process/settlement.html',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'money',
            navVisible: true,
            sidebarType: 'root',
            activeMatch: ['settlement.html'],
            hubVisible: true
          }
        ]
      },
      {
        id: 'consult',
        hubTitle: '상담 · 템플릿',
        nav: {
          type: 'single',
          label: '상담·템플릿',
          href: 'consult/',
          activeMatch: ['/consult']
        },
        sidebar: {
          title: '상담·템플릿'
        },
        items: [
          {
            id: 'consult-root',
            title: '회원 맞춤 페이지',
            description: 'URL 파라미터로 회원별 자료',
            href: 'consult/',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'doc',
            sidebarType: 'root',
            activeMatch: ['/consult'],
            hubVisible: true
          },
          {
            id: 'consult-prep',
            title: '상담 준비 자료',
            description: '재무 현황 시각화 (Chart.js)',
            href: 'consult/prep.html',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'doc',
            sidebarType: 'root',
            activeMatch: ['prep.html'],
            hubVisible: true
          },
          {
            id: 'slide-viewer',
            title: '슬라이드 템플릿',
            description: '기본 36종 + 베리언츠 95장',
            href: 'https://cdn-assets-three.vercel.app/slide-viewer/',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'doc',
            sidebarType: 'root',
            activeMatch: ['slide-viewer'],
            hubVisible: true
          }
        ]
      },
      {
        id: 'tools',
        hubTitle: '도구 · 기타',
        nav: {
          type: 'single',
          label: '도구·기타',
          href: 'tools/',
          activeMatch: ['/tools']
        },
        sidebar: {
          title: '도구·기타'
        },
        items: [
          {
            id: 'yt-bulk-editor',
            title: 'YT 일괄 편집기',
            description: '영상 설명글 · 핀댓글 일괄 수정',
            href: 'tools/yt-bulk-editor/',
            badgeText: 'LIVE',
            badgeTone: 'live',
            iconKey: 'tool',
            navVisible: true,
            sidebarType: 'root',
            activeMatch: ['yt-bulk-editor'],
            hubVisible: true
          }
        ]
      }
    ]
  };
})();
