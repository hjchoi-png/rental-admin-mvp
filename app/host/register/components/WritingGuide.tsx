"use client"

import { Lightbulb } from "@phosphor-icons/react"

interface WritingGuideProps {
  title: string
  items: readonly string[]
}

export default function WritingGuide({ title, items }: WritingGuideProps) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-blue-600" weight="fill" />
        <span className="text-sm font-medium text-blue-800">{title}</span>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
            <span className="text-blue-400 mt-1">&#8226;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
