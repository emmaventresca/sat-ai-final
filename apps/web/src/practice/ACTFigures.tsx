/**
 * ACT figures: graphs, charts, diagrams embedded in questions.
 * Renders SVG representations of common ACT math/science figures.
 */

export interface Figure {
  type: 'graph' | 'triangle' | 'circle' | 'chart' | 'grid'
  title?: string
  data?: Record<string, unknown>
}

export function ACTFigure({ figure }: { figure: Figure }) {
  if (figure.type === 'graph') return <GraphFigure data={figure.data} />
  if (figure.type === 'triangle') return <TriangleFigure data={figure.data} />
  if (figure.type === 'circle') return <CircleFigure data={figure.data} />
  if (figure.type === 'chart') return <ChartFigure data={figure.data} />
  if (figure.type === 'grid') return <GridFigure data={figure.data} />
  return <div>Unknown figure type</div>
}

function GraphFigure({ data }: { data?: Record<string, unknown> }) {
  const width = 300, height = 300, margin = 40
  const plotWidth = width - 2 * margin
  const plotHeight = height - 2 * margin

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: 4, marginBlock: 8 }}>
      {/* Grid */}
      {Array.from({ length: 5 }).map((_, i) => {
        const y = margin + (plotHeight / 4) * i
        return <line key={`h${i}`} x1={margin} y1={y} x2={width - margin} y2={y} stroke="#eee" strokeWidth="1" />
      })}
      {Array.from({ length: 5 }).map((_, i) => {
        const x = margin + (plotWidth / 4) * i
        return <line key={`v${i}`} x1={x} y1={margin} x2={x} y2={height - margin} stroke="#eee" strokeWidth="1" />
      })}

      {/* Axes */}
      <line x1={margin} y1={height - margin} x2={width - margin} y2={height - margin} stroke="#333" strokeWidth="2" />
      <line x1={margin} y1={margin} x2={margin} y2={height - margin} stroke="#333" strokeWidth="2" />

      {/* Axis labels */}
      <text x={width - 20} y={height - margin + 20} fontSize="12" fill="#333">x</text>
      <text x={margin - 20} y={margin - 10} fontSize="12" fill="#333">y</text>

      {/* Sample parabola */}
      <path
        d={Array.from({ length: 100 })
          .map((_, i) => {
            const t = i / 100
            const x = margin + t * plotWidth
            const y = height - margin - (Math.sin(t * Math.PI) * plotHeight * 0.8)
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          })
          .join(' ')}
        fill="none"
        stroke="#4A7C59"
        strokeWidth="2"
      />
    </svg>
  )
}

function TriangleFigure({ data }: { data?: Record<string, unknown> }) {
  const width = 280, height = 240
  const points = '140,20 40,200 240,200'
  const angle = (data?.angle as number) || 45
  const sideA = (data?.sideA as string) || '5'
  const sideB = (data?.sideB as string) || '5√2'

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: 4, marginBlock: 8 }}>
      <polygon points={points} fill="none" stroke="#333" strokeWidth="2" />
      {/* Labels */}
      <text x="140" y="40" textAnchor="middle" fontSize="14" fontWeight="bold">
        {angle}°
      </text>
      <text x="80" y="140" fontSize="12" fill="#4A7C59" fontWeight="bold">
        {sideA}
      </text>
      <text x="170" y="140" fontSize="12" fill="#4A7C59" fontWeight="bold">
        {sideB}
      </text>
    </svg>
  )
}

function CircleFigure({ data }: { data?: Record<string, unknown> }) {
  const size = 280
  const center = size / 2
  const radius = 80
  const angle = (data?.angle as number) || 60

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: 4, marginBlock: 8 }}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#333" strokeWidth="2" />

      {/* Radius lines */}
      <line
        x1={center}
        y1={center}
        x2={center + radius * Math.cos((angle * Math.PI) / 180)}
        y2={center - radius * Math.sin((angle * Math.PI) / 180)}
        stroke="#4A7C59"
        strokeWidth="2"
      />

      {/* Angle arc */}
      <path
        d={`M ${center + 30} ${center} A 30 30 0 0 0 ${center + 30 * Math.cos((angle * Math.PI) / 180)} ${center - 30 * Math.sin((angle * Math.PI) / 180)}`}
        fill="none"
        stroke="#4A7C59"
        strokeWidth="1.5"
      />
      <text x={center + 45} y={center - 10} fontSize="12" fill="#4A7C59" fontWeight="bold">
        {angle}°
      </text>
    </svg>
  )
}

function ChartFigure({ data }: { data?: Record<string, unknown> }) {
  const values = (data?.values as number[]) || [40, 60, 30, 80, 50]
  const width = 300, height = 200, margin = 30
  const barWidth = (width - 2 * margin) / values.length
  const maxValue = Math.max(...values)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: 4, marginBlock: 8 }}>
      {/* Axes */}
      <line x1={margin} y1={height - margin} x2={width - margin} y2={height - margin} stroke="#333" strokeWidth="2" />
      <line x1={margin} y1={margin} x2={margin} y2={height - margin} stroke="#333" strokeWidth="2" />

      {/* Bars */}
      {values.map((v, i) => {
        const barHeight = (v / maxValue) * (height - 2 * margin)
        const x = margin + i * barWidth + barWidth / 4
        const y = height - margin - barHeight
        return (
          <rect key={i} x={x} y={y} width={barWidth / 2} height={barHeight} fill="#5D7444" rx="2" />
        )
      })}
    </svg>
  )
}

function GridFigure({ data }: { data?: Record<string, unknown> }) {
  const size = 280
  const gridSize = 10

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: 4, marginBlock: 8 }}>
      {/* Grid lines */}
      {Array.from({ length: gridSize + 1 }).map((_, i) => {
        const pos = (i / gridSize) * size
        return (
          <g key={i}>
            <line x1={pos} y1="0" x2={pos} y2={size} stroke="#ddd" strokeWidth="1" />
            <line x1="0" y1={pos} x2={size} y2={pos} stroke="#ddd" strokeWidth="1" />
          </g>
        )
      })}

      {/* Grid border */}
      <rect x="0" y="0" width={size} height={size} fill="none" stroke="#333" strokeWidth="2" />

      {/* Sample point */}
      <circle cx={size / 2} cy={size / 2} r="4" fill="#4A7C59" />
      <text x={size / 2 + 10} y={size / 2 - 10} fontSize="12" fill="#333">
        (5, 5)
      </text>
    </svg>
  )
}
