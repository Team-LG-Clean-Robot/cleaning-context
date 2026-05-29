#import "report.typ": report, callout, kpi

#show: report.with(
  title: "기술 기획서 (Technical Plan)",
  subtitle: "생활 맥락을 이해하는 로봇청소기 — 가정용 Physical AI Agent 시뮬레이터",
  author: "전유성 (팀장) · 김준성 · 박주상 · 조현서",
  org: "팀 럭키 금성 · 성균관대 RISE 사업단 / LG전자 가전 멘토링 트랙",
  date: "2026.05.29",
  toc: true,
  pagebreak-h1: false,
)

// 문서가 §0~§16 수동 번호 + 다수의 내부 상호참조(§4.2 등)를 쓰므로
// 자동 번호 대신 수동 번호를 유지한다 (상호참조 일관성 보존).
#set heading(numbering: none)

#include "body.typ"
