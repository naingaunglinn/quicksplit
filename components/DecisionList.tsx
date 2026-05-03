import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface Props {
  decisions: string[]
}

export default function DecisionList({ decisions }: Props) {
  if (!decisions.length) return null

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Decisions Made
      </p>
      <Card className="p-5 shadow-sm">
        <ul className="space-y-3">
          {decisions.map((d, i) => (
            <li key={i} className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5 shrink-0">
                Decision
              </Badge>
              <p className="text-sm leading-relaxed">{d}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
