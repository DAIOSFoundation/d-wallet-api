module.exports = {
  apps: [
    {
      // pm2로 실행한 프로세스 목록에서 이 애플리케이션의 이름으로 지정될 문자열
      name: 'd-wallet-api',
      // pm2로 실행될 파일 경로
      script: './bin/www',
      watch: false,
      instances: 0, // 0으로 설정시 CPU 코어 수 만큼 프로세스 생성
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      exec_mode: 'cluster', // 클러스터 모드
      // 개발환경시 적용될 설정 지정
      env: {
        // pm2 start ecosystem.config.js
        // PORT: 8080,
        NODE_ENV: 'development',
      },
      // 배포환경시 적용될 설정 지정
      env_production: {
        // pm2 start ecosystem.config.js --env production
        // PORT: 80,
        NODE_ENV: 'production',
      },
    },
  ],
};
