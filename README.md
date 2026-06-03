# Newborn Feeding Check

신생아의 하루 수유량과 수유 횟수를 빠르게 기록하는 모바일 우선 정적 웹 서비스입니다.

## MVP

- 몸무게 기준 하루 권장 수유량 계산
- 목표 수유 횟수 기준 1회 권장량 계산
- 오늘 수유량, 횟수, 평균 1회량 기록
- 분유 하루 1000ml 상한 주의 표시
- 모바일 하단 빠른 기록 UI
- 광고 슬롯 플레이스홀더

## 계산 기준

- 하루 권장량: `몸무게(kg) x 150~160ml`
- 1회 권장량: `하루 권장량 / 목표 수유 횟수`
- 목표 수유 횟수 기본값: `8회`
- 분유 기준 하루 `1000ml` 이상은 의료진 상담 권장

## 개발

```bash
npm install
npm run dev
```

## 검증

```bash
npm run lint
npm run build
```

## BMAD

`bmad-method`가 dev dependency로 설치되어 있으며 Codex용 스킬은 `.agents/skills`에 구성되어 있습니다.

- PRD: `docs/bmad/planning-artifacts/prd.md`
- 구현 체크리스트: `docs/bmad/implementation-artifacts/mvp-checklist.md`

## 주의

이 서비스는 기록과 계산 보조 도구이며 의료 상담을 대체하지 않습니다. 조산아, 저체중아, 황달, 심한 구토, 탈수 의심, 체중 증가 부진은 의료진 상담을 우선하세요.
