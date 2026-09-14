import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryStat } from '../types'
import { CategoryIcon } from './icons'
import { formatCurrency } from '../utils/format'

interface Props {
  data: CategoryStat[]
}

export default function CategoryBreakdown({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">Sem dados neste período.</p>
    )
  }

  const pieData = data.map((item) => ({
    name: item.name,
    value: item.total,
    color: item.color || '#4f46e5',
  }))

  return (
    <div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 space-y-2">
        {data.slice(0, 6).map((item) => (
          <div key={item.category_id ?? item.name} className="flex items-center justify-between text-sm">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
              <CategoryIcon name={item.icon} className="h-4 w-4 shrink-0" style={{ color: item.color }} />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="ml-2 shrink-0 font-semibold">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}