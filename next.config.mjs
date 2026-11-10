// 설문 종료 스위치: true면 모든 설문 주소가 종료 안내 페이지(/closed)로 연결된다.
// 다시 열려면 false로 바꿔 배포한다. (설문 코드와 시트 데이터는 그대로 남아 있다.)
const SURVEYS_CLOSED = true;

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/reading-attitude", destination: "/survey-2", permanent: false },
    ];
  },
  async rewrites() {
    if (!SURVEYS_CLOSED) return [];
    return {
      beforeFiles: ["/", "/survey-1", "/survey-2"].map((source) => ({
        source,
        destination: "/closed",
      })),
    };
  },
};

export default nextConfig;
