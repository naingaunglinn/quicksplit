import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Task } from '@/types'

interface Props {
  tasks: Task[]
}

export default function TaskList({ tasks }: Props) {
  if (!tasks.length) return null

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Action Items
      </p>
      <Card className="divide-y divide-neutral-100 shadow-sm">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-start gap-4 p-4">
            <Badge variant="outline" className="mt-0.5 shrink-0 font-normal">
              {task.owner}
            </Badge>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {task.description}
            </p>
          </div>
        ))}
      </Card>
    </div>
  )
}
