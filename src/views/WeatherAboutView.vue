<template>
  <div class="container">
    <h2 class="info">ℹ️ 서비스 소개</h2>
    <BaseDashboardCard class="about-card">
      <p>본 앱은 Vue 3 및 Vue Router 기반으로 제작된 실습용 기상 관측 대시보드 시스템입니다.</p>
      <ul>
        <li><mark>components/exercise/</mark> 폴더 내부의 독립 부품 연동</li>
        <li>클라이언트 사이드 라우팅을 통한 새로고침 없는 화면 전환</li>
        <li>URL 쿼리 스트링 매핑을 활용한 실시간 검색 상태 동기화</li>
        <li>즐겨찾기 도시를 localStorage에 저장하고 다시 불러오기</li>
        <li>Pinia 전역 상태를 이용한 라이트·다크 테마 전환</li>
        <li>상세 라우트를 모달로 표시하고 배경 화면 스크롤 잠금 처리</li>
        <li>도시별 시간대·5일 예보 조회 및 localStorage 캐싱</li>
        <li>캐시 남은 시간 표시 및 최신 날씨 강제 갱신</li>
        <li>하나의 검색창에서 도시 필터와 새 도시 추가</li>
        <li>브라우저 위치 권한을 이용한 현재 위치 날씨 조회</li>
      </ul>
    </BaseDashboardCard>

    <BaseDashboardCard class="source-card">
      <h3>데이터 및 출처</h3>
      <ul>
        <li>
          <a href="https://openweathermap.org/" target="_blank" rel="noopener noreferrer">OpenWeather</a>
          — 현재 날씨, 도시 검색, 3시간·5일 예보 및 날씨 아이콘
        </li>
        <li>
          <a href="https://www.windy.com/" target="_blank" rel="noopener noreferrer">Windy.com</a>
          — 대한민국 중심 날씨 지도 및 레이어
        </li>
        <li>
          <a href="https://ui.nuxt.com/" target="_blank" rel="noopener noreferrer">Nuxt UI</a>
          — 버튼, 입력창 등 공통 UI 컴포넌트
        </li>
        <li>
          <a href="https://vue-bits.dev/text-animations/count-up" target="_blank" rel="noopener noreferrer">Vue Bits Count Up</a>
          — 현재 기온 숫자 애니메이션
        </li>
      </ul>
    </BaseDashboardCard>

    <UButton to="/" color="primary" variant="solid" class="btn-home">대시보드로 이동</UButton>
  </div>
</template>

<script setup>
import BaseDashboardCard from '@/components/exercise/BaseDashboardCard.vue'
</script>

<style scoped>
.container {
  margin: 20px auto 0;
}

.info {
  display: flex;
  align-items: center;
  margin: 0 0 14px;
  color: var(--color-heading);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.about-card,
.source-card {
  color: var(--color-text);
  font-size: 15px;
  line-height: 1.65;
}

.about-card p {
  margin: 0 0 4px;
}

.about-card ul {
  margin: 0;
  padding-left: 20px;
}

.about-card li + li {
  margin-top: 3px;
}

.about-card mark {
  padding: 2px 5px;
  border-radius: 4px;
  color: var(--color-text);
  background: var(--color-background-mute);
}

.source-card {
  margin-top: 10px;
}

.source-card h3 {
  margin: 0 0 6px;
  color: var(--color-heading);
  font-size: 16px;
}

.source-card ul {
  margin: 0;
  padding-left: 20px;
}

.source-card li + li {
  margin-top: 3px;
}

.source-card a {
  color: var(--color-heading);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.btn-home {
  margin-top: 14px;
}
</style>
