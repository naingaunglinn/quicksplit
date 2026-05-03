import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface Props {
  summary: string[]
}

export default function SummaryCards({ summary }: Props) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Quick Highlights
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary.map((point, i) => (
          <Card key={i} className="p-5 shadow-sm">
            <Badge variant="outline" className="mb-3 text-xs">
              Key Point {i + 1}
            </Badge>
            <p className="text-sm leading-relaxed">{point}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
