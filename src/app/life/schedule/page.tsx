'use client'
import { useEffect, useState, useCallback } from 'react'
import { Pencil, X, Plus } from 'lucide-react'
import { BlockModal, BlockFormData } from '@/components/schedule/BlockModal'

type ScheduleBlock = {
  id: string
  day: string
  startTime: string
  endTime: string | null
  name: string
  note: string | null
  category: string
  sacred: boolean
}

type ScheduleDay = {
  id: string
  day: string
  label: string | null
  summary: string | null
}

type ApiResponse = {
  blocks: Record<string, ScheduleBlock[]>
  days: Record<string, ScheduleDay>
}

const DAYS = [
  { key: 'mon', short: 'Mon', full: 'Monday' },
  { key: 'tue', short: 'Tue', full: 'Tuesday' },
  { key: 'wed', short: 'Wed', full: 'Wednesday' },
  { key: 'thu', short: 'Thu', full: 'Thursday' },
  { key: 'fri', short: 'Fri', full: 'Friday' },
  { key: 'sat', short: 'Sat', full: 'Saturday' },
  { key: 'sun', short: 'Sun', full: 'Sunday' },
]

const JS_DAY_TO_KEY: Record<number, string> = {
  1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun',
}

type CategoryColors = {
  bg: string
  border: string
  timeColor: string
  nameColor: string
  noteColor: string
  dot: string
}

const CATEGORY_COLORS: Record<string, CategoryColors> = {
  ritual:   { bg: '#F5F4FE', border: '#7F77DD', timeColor: '#534AB7', nameColor: '#3C3489', noteColor: '#534AB7', dot: '#7F77DD' },
  hypefy:   { bg: '#E6F1FB', border: '#378ADD', timeColor: '#185FA5', nameColor: '#0C447C', noteColor: '#185FA5', dot: '#378ADD' },
  agency:   { bg: '#FAEEDA', border: '#EF9F27', timeColor: '#854F0B', nameColor: '#633806', noteColor: '#854F0B', dot: '#EF9F27' },
  pt:       { bg: '#EAF3DE', border: '#639922', timeColor: '#3B6D11', nameColor: '#27500A', noteColor: '#3B6D11', dot: '#639922' },
  food:     { bg: '#FCEBEB', border: '#E24B4A', timeColor: '#A32D2D', nameColor: '#791F1F', noteColor: '#A32D2D', dot: '#E24B4A' },
  social:   { bg: '#FBEAF0', border: '#D4537E', timeColor: '#993556', nameColor: '#72243E', noteColor: '#993556', dot: '#D4537E' },
  property: { bg: '#F1EFE8', border: '#888780', timeColor: '#5F5E5A', nameColor: '#444441', noteColor: '#5F5E5A', dot: '#888780' },
  sleep:    { bg: '#EEEDFE', border: '#534AB7', timeColor: '#3C3489', nameColor: '#26215C', noteColor: '#3C3489', dot: '#534AB7' },
}

const CATEGORY_LABELS: Record<string, string> = {
  ritual: 'Ritual', hypefy: 'Hypefy', agency: 'Agency', pt: 'PT',
  food: 'Food', social: 'Social', property: 'Property', sleep: 'Sleep',
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 8) // 8..24

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  const hour = h === 0 ? 24 : h
  return hour * 60 + (m ?? 0)
}

const DAY_START = 8 * 60  // 08:00
const DAY_END   = 24 * 60 + 30 // 00:30 next day shown as 24:30
const PX_PER_MIN = 1.2

function minutesToPx(minutes: number): number {
  return (minutes - DAY_START) * PX_PER_MIN
}

function Block({
  block,
  editMode,
  onEdit,
  onDelete,
}: {
  block: ScheduleBlock
  editMode: boolean
  onEdit: (b: ScheduleBlock) => void
  onDelete: (b: ScheduleBlock) => void
}) {
  const colors = CATEGORY_COLORS[block.category] ?? CATEGORY_COLORS.ritual
  const startMin = timeToMinutes(block.startTime)
  const endMin = block.endTime ? timeToMinutes(block.endTime) : startMin + 30
  const top = minutesToPx(startMin)
  const height = Math.max(minutesToPx(endMin) - minutesToPx(startMin), 28)
  const isShort = height < 50

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        height,
        background: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
        borderRadius: 6,
        padding: isShort ? '2px 8px' : '6px 10px',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: colors.timeColor, whiteSpace: 'nowrap' }}>
            {block.startTime}{block.endTime ? ` – ${block.endTime}` : ''}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.nameColor, lineHeight: 1.3 }}>
            {block.name}
          </span>
          {block.sacred && (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#7C3AED',
              background: '#EDE9FE',
              border: '1px solid #C4B5FD',
              borderRadius: 99,
              padding: '0px 6px',
              whiteSpace: 'nowrap',
            }}>sacred</span>
          )}
        </div>
        {editMode && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => onEdit(block)}
              style={{
                background: 'rgba(255,255,255,0.85)',
                border: '1px solid #e5e7eb',
                borderRadius: 5,
                padding: '2px 5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Edit"
            >
              <Pencil size={11} color="#6366f1" />
            </button>
            <button
              onClick={() => onDelete(block)}
              style={{
                background: 'rgba(255,255,255,0.85)',
                border: '1px solid #e5e7eb',
                borderRadius: 5,
                padding: '2px 5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Delete"
            >
              <X size={11} color="#ef4444" />
            </button>
          </div>
        )}
      </div>
      {!isShort && block.note && (
        <p style={{
          fontSize: 11,
          color: colors.noteColor,
          marginTop: 3,
          lineHeight: 1.4,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}>
          {block.note}
        </p>
      )}
    </div>
  )
}

export default function SchedulePage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [activeDay, setActiveDay] = useState<string>('mon')
  const [editMode, setEditMode] = useState(false)
  const [modal, setModal] = useState<
    | { mode: 'add' }
    | { mode: 'edit'; block: ScheduleBlock }
    | null
  >(null)
  const [dayLabel, setDayLabel] = useState<Record<string, string>>({})
  const [daySummary, setDaySummary] = useState<Record<string, string>>({})

  useEffect(() => {
    // Auto-select today
    const today = JS_DAY_TO_KEY[new Date().getDay()] ?? 'mon'
    setActiveDay(today)
  }, [])

  const loadData = useCallback(async () => {
    const res = await fetch('/api/life/schedule')
    const json: ApiResponse = await res.json()
    setData(json)
    const labels: Record<string, string> = {}
    const summaries: Record<string, string> = {}
    for (const d of Object.values(json.days)) {
      labels[d.day] = d.label ?? ''
      summaries[d.day] = d.summary ?? ''
    }
    setDayLabel(labels)
    setDaySummary(summaries)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function saveDay(day: string) {
    await fetch(`/api/life/schedule/${day}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _type: 'day', label: dayLabel[day] ?? '', summary: daySummary[day] ?? '' }),
    })
  }

  async function handleSaveBlock(formData: BlockFormData) {
    if (modal?.mode === 'edit') {
      await fetch(`/api/life/schedule/${modal.block.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
    } else {
      await fetch('/api/life/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, day: activeDay }),
      })
    }
    setModal(null)
    await loadData()
  }

  async function handleDeleteBlock(block: ScheduleBlock) {
    await fetch(`/api/life/schedule/${block.id}`, { method: 'DELETE' })
    setModal(null)
    await loadData()
  }

  const blocks = data?.blocks[activeDay] ?? []
  const totalHeight = minutesToPx(DAY_END) + 20

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '24px 0' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Weekly Schedule</h1>
          <button
            onClick={() => setEditMode((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 10,
              border: editMode ? '1.5px solid #6366f1' : '1.5px solid #e5e7eb',
              background: editMode ? '#EEF2FF' : '#fff',
              color: editMode ? '#4F46E5' : '#374151',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <Pencil size={14} />
            {editMode ? 'Done editing' : 'Edit'}
          </button>
        </div>

        {/* Day nav tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {DAYS.map((d) => {
            const isActive = activeDay === d.key
            return (
              <button
                key={d.key}
                onClick={() => setActiveDay(d.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: isActive ? '1.5px solid #6366f1' : '1.5px solid #e5e7eb',
                  background: isActive ? '#6366f1' : '#fff',
                  color: isActive ? '#fff' : '#374151',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {d.short}
              </button>
            )
          })}
        </div>

        {/* Color legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 14 }}>
          {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: colors.dot, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{CATEGORY_LABELS[cat]}</span>
            </div>
          ))}
        </div>

        {/* Day summary box */}
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 20,
        }}>
          {editMode ? (
            <>
              <input
                value={dayLabel[activeDay] ?? ''}
                onChange={(e) => setDayLabel((prev) => ({ ...prev, [activeDay]: e.target.value }))}
                onBlur={() => saveDay(activeDay)}
                placeholder="Day label (e.g. Monday — PT day.)"
                style={{
                  width: '100%',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#111827',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  marginBottom: 6,
                  borderBottom: '1.5px dashed #d1d5db',
                  paddingBottom: 4,
                }}
              />
              <textarea
                value={daySummary[activeDay] ?? ''}
                onChange={(e) => setDaySummary((prev) => ({ ...prev, [activeDay]: e.target.value }))}
                onBlur={() => saveDay(activeDay)}
                placeholder="Day summary..."
                rows={3}
                style={{
                  width: '100%',
                  fontSize: 12,
                  color: '#6B7280',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
              />
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                {dayLabel[activeDay] || DAYS.find((d) => d.key === activeDay)?.full}
              </p>
              <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.55 }}>
                {daySummary[activeDay] || 'No summary.'}
              </p>
            </>
          )}
        </div>

        {/* Timeline */}
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 14,
          padding: '16px 16px 16px 0',
          position: 'relative',
        }}>
          <div style={{ display: 'flex' }}>
            {/* Hour labels column */}
            <div style={{ width: 48, flexShrink: 0, position: 'relative', height: totalHeight }}>
              {HOURS.map((h) => {
                const min = h * 60
                const top = minutesToPx(min)
                const label = h === 24 ? '00:00' : `${String(h).padStart(2, '0')}:00`
                return (
                  <div
                    key={h}
                    style={{
                      position: 'absolute',
                      top,
                      right: 8,
                      fontSize: 10,
                      color: '#9CA3AF',
                      fontWeight: 500,
                      lineHeight: 1,
                      transform: 'translateY(-50%)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </div>
                )
              })}
            </div>

            {/* Blocks column */}
            <div style={{ flex: 1, position: 'relative', height: totalHeight }}>
              {/* Horizontal hour lines */}
              {HOURS.map((h) => {
                const top = minutesToPx(h * 60)
                return (
                  <div
                    key={h}
                    style={{
                      position: 'absolute',
                      top,
                      left: 0,
                      right: 0,
                      height: 1,
                      background: '#F3F4F6',
                    }}
                  />
                )
              })}

              {/* Blocks */}
              {blocks.map((block) => (
                <Block
                  key={block.id}
                  block={block}
                  editMode={editMode}
                  onEdit={(b) => setModal({ mode: 'edit', block: b })}
                  onDelete={(b) => handleDeleteBlock(b)}
                />
              ))}
            </div>
          </div>

          {/* Add block button */}
          {editMode && (
            <div style={{ marginTop: 16, paddingLeft: 48 }}>
              <button
                onClick={() => setModal({ mode: 'add' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: '1.5px dashed #6366f1',
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                Add block
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <BlockModal
          initial={modal.mode === 'edit' ? {
            id: modal.block.id,
            startTime: modal.block.startTime,
            endTime: modal.block.endTime ?? '',
            name: modal.block.name,
            note: modal.block.note ?? '',
            category: modal.block.category,
            sacred: modal.block.sacred,
          } : undefined}
          onSave={handleSaveBlock}
          onDelete={modal.mode === 'edit' ? () => handleDeleteBlock(modal.block) : undefined}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
