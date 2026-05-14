// common.typ — 모든 pdf 템플릿 공유 색/박스/헬퍼
// 개별 템플릿(briefing/report/proposal/article)은 이 모듈을 import 해 쓴다.
//
// 디자인 원칙: 네이비 + 회색 톤온톤. 다색 강조 박스(파랑/노랑/빨강/초록)는 쓰지 않는다.

#let palette = (
  navy: rgb("#0f1e3d"),
  ink: rgb("#1a1a1a"),
  gray-1: rgb("#6b7280"),
  gray-2: rgb("#e5e7eb"),
  zebra: rgb("#fafbfc"),
  head-bg: rgb("#eef2f7"),
  callout-bg: rgb("#f5f6f8"),
)

// 단일 강조 블록 — 모든 "참고/주의/메모" 성격 문장을 하나로 통일.
// 의미 구분은 색이 아니라 본문 서두 라벨로 한다. 예: *주의:* 민감 정보 제외.
#let callout(body) = block(
  fill: palette.callout-bg,
  stroke: (left: 2.5pt + palette.navy),
  inset: (left: 12pt, right: 10pt, y: 8pt),
  width: 100%,
)[#text(size: 9.5pt)[#body]]

// 큰 숫자 강조 블록
// 사용: #kpi("MAU", "12.4만", delta: "+18%")
#let kpi(label, value, delta: none) = block(
  fill: palette.head-bg,
  inset: 12pt,
  radius: 4pt,
  width: 100%,
)[
  #text(size: 9pt, fill: palette.gray-1)[#label] \
  #text(size: 20pt, weight: "bold", fill: palette.navy)[#value]
  #if delta != none [
    #h(0.5em) #text(size: 10pt, fill: palette.gray-1)[#delta]
  ]
]
