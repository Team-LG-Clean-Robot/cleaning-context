// proposal.typ — 사업/기획 제안서
// 특징: 네이비 풀블리드 커버 + 네이비 섹션 마커 + KPI 강조
//
// #import "proposal.typ": proposal, callout, kpi
// #show: proposal.with(
//   title: "...", subtitle: "...", tagline: "한 줄 메시지",
//   org: "어스큐리", date: "2026-04",
// )

#import "common.typ": palette, callout, kpi

// 네이비 배경 위에서 보조 텍스트용(같은 계열의 밝은 톤, 단색 계열 유지)
#let _navy-soft = rgb("#a3b4d4")

#let proposal(
  title: "제안서",
  subtitle: none,
  tagline: none,
  org: none,
  date: none,
  body-size: 10.5pt,
  body,
) = {
  set text(font: "Pretendard", weight: "regular", size: body-size, lang: "ko")
  set par(justify: true, leading: 1.0em, spacing: 1.6em, first-line-indent: 0pt)
  set list(spacing: 1.0em, indent: 0.4em)
  set enum(spacing: 1.0em, indent: 0.4em)

  // ── 풀블리드 커버 ───────────────────────────────
  page(
    paper: "a4",
    margin: 0cm,
    numbering: none,
    fill: palette.navy,
  )[
    #set text(fill: white)
    #v(1fr)
    #pad(x: 2.5cm)[
      #text(size: 12pt, fill: _navy-soft, weight: "semibold")[PROPOSAL]
      #v(1em)
      #text(size: 36pt, weight: "bold")[#title]
      #if subtitle != none [
        #v(0.3em)
        #text(size: 16pt, fill: _navy-soft)[#subtitle]
      ]
      #if tagline != none [
        #v(2em)
        #text(size: 13pt, style: "italic")[#tagline]
      ]
    ]
    #v(1fr)
    #pad(left: 2.5cm, right: 2.5cm, bottom: 2cm)[
      #if org != none [ #text(size: 11pt)[#org] \ ]
      #if date != none [ #text(size: 10pt, fill: _navy-soft)[#date] ]
    ]
  ]

  // ── 본문 페이지 ────────────────────────────────
  set page(
    paper: "a4",
    margin: (x: 2.2cm, y: 2.5cm),
    numbering: "1",
    number-align: center,
  )
  counter(page).update(1)

  // ── 헤딩 ──────────────────────────────────────
  set heading(numbering: "1.")
  show heading.where(level: 1): it => [
    #pagebreak(weak: true)
    #set text(font: "Pretendard", size: 20pt, weight: "bold", fill: palette.navy)
    #block(above: 1.4em, below: 0.6em)[
      #if it.numbering != none [#counter(heading).display()#h(0.4em)]#it.body
    ]
  ]
  show heading.where(level: 2): it => [
    #set text(font: "Pretendard", size: 14pt, weight: "bold", fill: palette.navy)
    #block(above: 2.0em, below: 0.9em)[
      #box(
        fill: palette.navy,
        inset: (x: 4pt, y: 1pt),
        radius: 1pt,
        outset: (y: 2pt),
      )[#text(fill: white, size: 9pt, weight: "bold")[#sym.bullet]]
      #h(0.5em)
      #it.body
    ]
  ]
  show heading.where(level: 3): it => [
    #set text(font: "Pretendard", size: 11.5pt, weight: "semibold", fill: palette.navy)
    #block(above: 1.4em, below: 0.6em)[#it.body]
  ]

  // ── 표 ────────────────────────────────────────
  show table.cell.where(y: 0): set text(font: "Pretendard", weight: "semibold")
  set table(
    stroke: 0.4pt + gray,
    inset: (x: 8pt, y: 8pt),
    fill: (_, y) => if y == 0 {
      palette.head-bg
    } else if calc.odd(y) {
      palette.zebra
    },
  )
  show link: set text(fill: palette.navy)

  body
}
