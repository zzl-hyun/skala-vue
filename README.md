# 구현 기능

기능별 `구현 파일`을 선택하면 관련 코드를 바로 확인할 수 있습니다.

- **실시간 도시 검색** — 검색 즉시 카드 필터링, 쉼표를 이용한 다중 검색
  - 구현 파일: [`SearchBar.vue`](src/components/exercise/SearchBar.vue), [`weatherParent.vue`](src/components/exercise/weatherParent.vue)
- **검색 URL 동기화** — 검색어를 `?q=`에 저장하고 새로고침·URL 공유 시 복원
  - 구현 파일: [`weatherParent.vue`](src/components/exercise/weatherParent.vue)
- **다중 기준 정렬** — 이름·기온·체감온도·습도·풍속 정렬 및 오름차순·내림차순 전환
  - 구현 파일: [`weatherParent.vue`](src/components/exercise/weatherParent.vue)
- **즐겨찾기** — 도시별 즐겨찾기와 즐겨찾기 전용 필터, 브라우저 재접속 시 복원
  - 구현 파일: [`useFavoriteCities.js`](src/composables/useFavoriteCities.js), [`weatherParent.vue`](src/components/exercise/weatherParent.vue), [`weatherCard.vue`](src/components/exercise/weatherCard.vue)
- **온도 단위 변경** — Pinia를 이용해 전체 화면의 섭씨·화씨를 동시에 변경
  - 구현 파일: [`configStore.js`](src/stores/configStore.js), [`UnitToggler.vue`](src/components/exercise/UnitToggler.vue), [`weatherCard.vue`](src/components/exercise/weatherCard.vue), [`WeatherDetailView.vue`](src/views/WeatherDetailView.vue)
- **라이트·다크 모드** — Pinia 전역 테마 상태와 CSS 색상 토큰을 이용한 화면 테마 전환
  - 구현 파일: [`configStore.js`](src/stores/configStore.js), [`ThemeToggler.vue`](src/components/exercise/ThemeToggler.vue), [`App.vue`](src/App.vue), [`base.css`](src/assets/base.css)
- **라우팅 기반 모달** — URL이 변경되는 상세 라우트를 대시보드 위 모달로 표시
  - 구현 파일: [`router/index.js`](src/router/index.js), [`WeatherHomeView.vue`](src/views/WeatherHomeView.vue), [`WeatherDetailView.vue`](src/views/WeatherDetailView.vue)
- **모달 스크롤 제어** — 상세 모달이 열리면 배경 스크롤을 잠그고 닫을 때 복원
  - 구현 파일: [`WeatherHomeView.vue`](src/views/WeatherHomeView.vue)
- **시간대별 예보** — 현재부터 3시간 간격의 기온·아이콘·강수확률·풍속을 가로 스크롤로 표시
  - 구현 파일: [`weatherApi.js`](src/api/weatherApi.js), [`WeatherDetailView.vue`](src/views/WeatherDetailView.vue)
- **5일 예보** — 도시별 최고·최저 기온, 날씨, 강수확률 표시
  - 구현 파일: [`weatherApi.js`](src/api/weatherApi.js), [`WeatherDetailView.vue`](src/views/WeatherDetailView.vue)
- **온도 카운트 효과** — 카드와 상세 모달의 현재 기온을 목표값까지 자연스럽게 증가시키는 애니메이션
  - 구현 파일: [`CountUp.vue`](src/components/exercise/CountUp.vue), [`weatherCard.vue`](src/components/exercise/weatherCard.vue), [`WeatherDetailView.vue`](src/views/WeatherDetailView.vue)
- **API 캐싱** — 현재 날씨·도시별 예보는 1시간, 기상특보는 30분 동안 캐싱
  - 구현 파일: [`weatherApi.js`](src/api/weatherApi.js), [`kmaWarningApi.js`](src/api/kmaWarningApi.js)
- **캐시 상태·갱신** — 캐시 사용 여부와 남은 시간을 표시하고 만료 시 자동 또는 버튼으로 갱신
  - 구현 파일: [`weatherApi.js`](src/api/weatherApi.js), [`weatherParent.vue`](src/components/exercise/weatherParent.vue)
- **사용자 도시 추가** — 기존 목록 필터와 카카오 주소 검색을 하나의 검색창으로 통합하고 좌표 기반 날씨 조회
  - 구현 파일: [`SearchBar.vue`](src/components/exercise/SearchBar.vue), [`weatherApi.js`](src/api/weatherApi.js), [`weatherParent.vue`](src/components/exercise/weatherParent.vue)
- **도시 카드 삭제** — 기본·사용자 추가·현재 위치 카드를 삭제하고 저장 목록·캐시·즐겨찾기 상태를 함께 정리
  - 구현 파일: [`weatherCard.vue`](src/components/exercise/weatherCard.vue), [`weatherParent.vue`](src/components/exercise/weatherParent.vue), [`weatherApi.js`](src/api/weatherApi.js), [`useFavoriteCities.js`](src/composables/useFavoriteCities.js)
- **내 위치 날씨** — 브라우저 위치 권한으로 현재 지역 날씨를 세션 동안 목록 최상단에 표시
  - 구현 파일: [`weatherParent.vue`](src/components/exercise/weatherParent.vue), [`weatherApi.js`](src/api/weatherApi.js)
- **기상특보** — 기상청 특보를 도시별로 연결해 카드에는 대표 특보, 상세 모달에는 전체 특보 표시
  - 구현 파일: [`fetch-kma-warnings.mjs`](scripts/fetch-kma-warnings.mjs), [`kmaWarningApi.js`](src/api/kmaWarningApi.js), [`weatherCard.vue`](src/components/exercise/weatherCard.vue), [`WeatherDetailView.vue`](src/views/WeatherDetailView.vue)
- **컴포넌트 분리** — 검색·카드·지도·단위 기능을 분리하고 props/emits로 연결
  - 구현 파일: [`BaseDashboardCard.vue`](src/components/exercise/BaseDashboardCard.vue), [`SearchBar.vue`](src/components/exercise/SearchBar.vue), [`weatherCard.vue`](src/components/exercise/weatherCard.vue), [`WeatherMap.vue`](src/components/exercise/WeatherMap.vue), [`weatherParent.vue`](src/components/exercise/weatherParent.vue)
- **날씨 지도** — Windy의 기온·강수·구름·기압·바람·레이더·UV 레이어 전환
  - 구현 파일: [`WeatherMap.vue`](src/components/exercise/WeatherMap.vue), [`weatherParent.vue`](src/components/exercise/weatherParent.vue)
- **예외 처리** — API 로딩·성공·실패 상태를 구분해 표시
  - 구현 파일: [`weatherParent.vue`](src/components/exercise/weatherParent.vue), [`WeatherDetailView.vue`](src/views/WeatherDetailView.vue)
- **404 화면 제공** — 등록되지 않은 URL을 별도의 404 화면으로 연결 ([배포 화면 확인](https://zzl-hyun.github.io/skala-vue/#/no))
  - 구현 파일: [`router/index.js`](src/router/index.js), [`NotFoundView.vue`](src/views/NotFoundView.vue)
- **반응형 UI** — 날씨 카드 2열·1열 전환과 모바일 상세 모달 대응
  - 구현 파일: [`weatherParent.vue`](src/components/exercise/weatherParent.vue), [`weatherCard.vue`](src/components/exercise/weatherCard.vue), [`WeatherHomeView.vue`](src/views/WeatherHomeView.vue), [`WeatherDetailView.vue`](src/views/WeatherDetailView.vue)

# 사용 라이브러리

- **Vue 3** — Composition API와 컴포넌트 기반 화면 구성
- **Vue Router · Pinia** — 라우팅, 검색 쿼리, 전역 단위·테마 상태 관리
- **Axios** — OpenWeather 날씨·예보, 카카오 주소 검색, 기상특보 JSON 요청
- **Nuxt UI · Tailwind CSS** — 공통 UI 컴포넌트와 스타일 시스템
- **Vue Bits Count Up · Vite** — 온도 숫자 애니메이션과 개발·빌드 환경

# 외부 API 및 서비스

- **OpenWeather Current Weather API** — 기본·사용자 추가 도시의 현재 관측 정보 조회
- **OpenWeather 5 Day / 3 Hour Forecast API** — 선택 도시의 3시간 간격 예보를 5일 일별 예보로 가공
- **Kakao Local API** — 국내 행정구역 주소 검색과 날씨 조회용 좌표 변환
- **기상청 API Hub** — 전국 기상특보를 조회해 도시별 주의보·경보 표시
- **Windy Embed Map** — 대한민국 중심 날씨 지도와 레이어 표시
- **Browser Geolocation API** — 사용자 동의 후 현재 위도·경도를 조회해 위치 기반 날씨 표시
- **GitHub Actions · GitHub Pages** — `main` 브랜치 자동 빌드 및 배포
