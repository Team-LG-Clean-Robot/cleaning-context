// briefing.typ — 짧은 브리핑·메모·요약 (1~5p)
// 특징: 표지 없음, 상단 타이틀 블록, zebra 표, 강조 박스
//
// #import "briefing.typ": briefing, callout, kpi
// #show: briefing.with(title: "...", subtitle: "...", meta: "...")

#import "common.typ": palette, callout, kpi

#let briefing(
  title: none,
  subtitle: none,
  meta: none,
  body-size: 10.5pt,
  body,
) = {
  set page(
    paper: "a4",
    margin: (x: 2.2cm, y: 2.3cm),
    numbering: "1 / 1",
    number-align: center,
  )
  set text(font: "Pretendard", weight: "regular", size: body-size, lang: "ko", cjk-latin-spacing: auto, hyphenate: false)
  set par(justify: true, linebreaks: "optimized", leading: 1.0em, spacing: 1.6em, first-line-indent: 0pt)
  set list(spacing: 1.0em, indent: 0.4em)
  set enum(spacing: 1.0em, indent: 0.4em)

  // 한글 어절(연속된 한글 음절)을 box로 감싸 음절 단위 절단 방지
  // "로봇청소기" 같은 단어가 "로봇청 / 소기"로 잘리지 않도록 함
  show regex("[\p{Hangul}]+"): word => box(word.text)

  show heading.where(level: 1): it => [
    #set text(font: "Pretendard", size: 18pt, weight: "bold")
    #block(above: 1.2em, below: 0.8em)[#it.body]
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
  show table: it => [
    #v(0.3em)
    #it
    #v(0.3em)
  ]

  show link: set text(fill: palette.navy)

  if title != none {
    align(center)[
      #text(font: "Pretendard", size: 22pt, weight: "bold")[#title]
      #if subtitle != none {
        v(-0.3em)
        text(size: 10pt, fill: gray)[#subtitle]
      }
      #if meta != none {
        v(-0.5em)
        text(size: 9pt, fill: gray)[#meta]
      }
    ]
    v(0.5em)
  }

  body
}
