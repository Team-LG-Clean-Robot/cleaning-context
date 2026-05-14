// report.typ — 공식 보고서 (10p+)
// 특징: 단독 표지 + TOC + 러닝 헤더 + 풋터 페이지 번호
//
// #import "report.typ": report, callout, kpi
// #show: report.with(
//   title: "...", subtitle: "...", author: "...", org: "...", date: "...",
//   toc: true,
//   pagebreak-h1: true,   // H1마다 페이지 개행. 짧은 섹션이 많은 문서는 false 권장
// )

#import "common.typ": palette, callout, kpi

#let report(
  title: "제목 없음",
  subtitle: none,
  author: none,
  org: none,
  date: none,
  body-size: 10.5pt,
  toc: true,
  pagebreak-h1: true,
  body,
) = {
  set text(font: "Pretendard", weight: "regular", size: body-size, lang: "ko")
  set par(justify: true, leading: 1.0em, spacing: 1.6em, first-line-indent: 0pt)
  set list(spacing: 1.0em, indent: 0.4em)
  set enum(spacing: 1.0em, indent: 0.4em)

  // ── 표지 페이지 (번호 없음) ──────────────────────
  page(
    paper: "a4",
    margin: (x: 2.2cm, y: 2.3cm),
    numbering: none,
  )[
    #v(1fr)
    #align(center)[
      #text(size: 28pt, weight: "bold", fill: palette.navy)[#title]
      #if subtitle != none [
        #v(0.6em)
        #text(size: 14pt, fill: palette.gray-1)[#subtitle]
      ]
    ]
    #v(1fr)
    #align(center)[
      #if org != none [ #text(size: 11pt)[#org] \ ]
      #if author != none [ #text(size: 11pt)[#author] \ ]
      #if date != none [ #text(size: 10pt, fill: palette.gray-1)[#date] ]
    ]
    #v(2em)
  ]

  // ── 본문 페이지 설정 ────────────────────────────
  set page(
    paper: "a4",
    margin: (x: 2.2cm, y: 2.8cm),
    header: context {
      set text(size: 8pt, fill: palette.gray-1)
      title
      h(1fr)
      if date != none { date }
    },
    footer: context {
      set align(center)
      set text(size: 9pt, fill: palette.gray-1)
      counter(page).display("1 / 1", both: true)
    },
  )
  counter(page).update(1)

  // ── 헤딩 스타일 ─────────────────────────────────
  set heading(numbering: "1.")
  show heading.where(level: 1): it => [
    #if pagebreak-h1 [#pagebreak(weak: true)]
    #set text(font: "Pretendard", size: 18pt, weight: "bold", fill: palette.navy)
    #block(above: 1.4em, below: 0.8em)[
      #if it.numbering != none [#counter(heading).display()#h(0.4em)]#it.body
    ]
  ]
  show heading.where(level: 2): it => [
    #set text(font: "Pretendard", size: 14pt, weight: "bold", fill: palette.navy)
    #block(above: 2.2em, below: 0.4em)[#it.body]
    #line(length: 100%, stroke: 0.8pt + palette.navy)
    #v(1.0em)
  ]
  show heading.where(level: 3): it => [
    #set text(font: "Pretendard", size: 11.5pt, weight: "semibold", fill: palette.navy)
    #block(above: 1.4em, below: 0.7em)[#it.body]
  ]

  // ── 표 스타일 ──────────────────────────────────
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

  // ── TOC ───────────────────────────────────────
  if toc {
    heading(level: 1, numbering: none)[목차]
    outline(title: none, depth: 3, indent: auto)
    pagebreak()
  }

  body
}
