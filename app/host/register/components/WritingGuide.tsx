"use client"

import { Lightbulb } from "@phosphor-icons/react"

interface WritingGuideProps {
  title: string
  items: readonly string[]
}

export default function WritingGuide({ title, items }: WritingGuideProps) {
  return (
    <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-primary" weight="fill" />
        <span className="text-sm font-medium text-primary">{title}</span>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-primary/70 flex items-start gap-2">
            <span className="text-primary/40 mt-1">&#8226;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
