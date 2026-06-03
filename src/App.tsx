import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Baby,
  CalendarDays,
  Clock3,
  Droplets,
  Plus,
  RotateCcw,
} from 'lucide-react'

type FeedEntry = {
  id: string
  amount: number
  createdAt: string
}

const FEED_ENTRIES_KEY = 'newborn-feeding-check.entries'
const BIRTH_DATE_KEY = 'newborn-feeding-check.birth-date'
const WEIGHT_KEY = 'newborn-feeding-check.weight'
const FEED_COUNT_KEY = 'newborn-feeding-check.feed-count'

const mlFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 0,
})
const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
})

function getStoredNumber(key: string, fallback: number) {
  const stored = window.localStorage.getItem(key)
  const value = stored ? Number(stored) : fallback

  return Number.isFinite(value) ? value : fallback
}

function getTodayInputDate() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)

  return localDate.toISOString().slice(0, 10)
}

function getAgeDays(birthDate: string) {
  if (!birthDate) {
    return 0
  }

  const birthTime = new Date(`${birthDate}T00:00:00`).getTime()
  if (!Number.isFinite(birthTime)) {
    return 0
  }

  const today = new Date()
  const todayTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()
  const dayMs = 24 * 60 * 60 * 1000

  return Math.max(0, Math.floor((todayTime - birthTime) / dayMs))
}

function getStoredEntries() {
  try {
    const stored = window.localStorage.getItem(FEED_ENTRIES_KEY)
    return stored ? (JSON.parse(stored) as FeedEntry[]) : []
  } catch {
    return []
  }
}

function isToday(date: Date) {
  const now = new Date()

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function roundToFive(value: number) {
  return Math.round(value / 5) * 5
}

function formatMl(value: number) {
  return `${mlFormatter.format(Math.max(0, Math.round(value)))}ml`
}

function getFeedingGuide(ageDays: number, weight: number, feedsPerDay: number) {
  if (ageDays <= 3) {
    return {
      mode: '초기 수유 기준',
      dailyMin: 30 * feedsPerDay,
      dailyMax: 60 * feedsPerDay,
      perFeedMin: 30,
      perFeedMax: 60,
      note:
        '생후 첫 며칠은 체중 공식보다 1회 30~60ml, 2~3시간 간격을 우선 참고합니다.',
    }
  }

  if (ageDays <= 7) {
    return {
      mode: '전환 구간 기준',
      dailyMin: 60 * feedsPerDay,
      dailyMax: Math.min(90 * feedsPerDay, 1000),
      perFeedMin: 60,
      perFeedMax: 90,
      note:
        '생후 4~7일은 먹는 양이 빠르게 늘어나는 구간이라 아기 상태와 병원 안내를 함께 봅니다.',
    }
  }

  const dailyMin = weight * 150
  const dailyMax = Math.min(weight * 160, 1000)

  return {
    mode: '체중 공식 기준',
    dailyMin,
    dailyMax,
    perFeedMin: dailyMin / feedsPerDay,
    perFeedMax: dailyMax / feedsPerDay,
    note:
      '생후 8일 이후부터는 몸무게 기준 하루 권장량을 기본값으로 계산합니다.',
  }
}

function App() {
  const [birthDate, setBirthDate] = useState(
    () => window.localStorage.getItem(BIRTH_DATE_KEY) ?? getTodayInputDate(),
  )
  const [weight, setWeight] = useState(() => getStoredNumber(WEIGHT_KEY, 4))
  const [feedsPerDay, setFeedsPerDay] = useState(() =>
    getStoredNumber(FEED_COUNT_KEY, 8),
  )
  const [feedAmount, setFeedAmount] = useState(60)
  const [entries, setEntries] = useState<FeedEntry[]>(() => getStoredEntries())

  useEffect(() => {
    window.localStorage.setItem(BIRTH_DATE_KEY, birthDate)
  }, [birthDate])

  useEffect(() => {
    window.localStorage.setItem(WEIGHT_KEY, String(weight))
  }, [weight])

  useEffect(() => {
    window.localStorage.setItem(FEED_COUNT_KEY, String(feedsPerDay))
  }, [feedsPerDay])

  useEffect(() => {
    window.localStorage.setItem(FEED_ENTRIES_KEY, JSON.stringify(entries))
  }, [entries])

  const todayEntries = useMemo(
    () =>
      entries
        .filter((entry) => isToday(new Date(entry.createdAt)))
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        ),
    [entries],
  )

  const ageDays = getAgeDays(birthDate)
  const guide = getFeedingGuide(ageDays, weight, feedsPerDay)
  const dailyMin = guide.dailyMin
  const dailyMax = guide.dailyMax
  const perFeedMin = guide.perFeedMin
  const perFeedMax = guide.perFeedMax
  const quickAmounts =
    ageDays <= 3
      ? [30, 40, 50, 60]
      : ageDays <= 7
        ? [60, 70, 80, 90]
        : [60, 80, 100, 120]
  const totalAmount = todayEntries.reduce((sum, entry) => sum + entry.amount, 0)
  const remainingAmount = Math.max(0, dailyMin - totalAmount)
  const progress = Math.min(100, Math.round((totalAmount / dailyMin) * 100))
  const lastEntry = todayEntries[0]
  const nextFeedText = lastEntry
    ? timeFormatter.format(
        new Date(
          new Date(lastEntry.createdAt).getTime() +
            (24 / feedsPerDay) * 60 * 60 * 1000,
        ),
      )
    : '첫 기록 전'

  function addFeed(amount = feedAmount) {
    const normalizedAmount = Math.max(0, Math.round(amount))

    if (!normalizedAmount) {
      return
    }

    setEntries((currentEntries) => [
      {
        id: crypto.randomUUID(),
        amount: normalizedAmount,
        createdAt: new Date().toISOString(),
      },
      ...currentEntries,
    ])
    setFeedAmount(normalizedAmount)
  }

  function resetToday() {
    setEntries((currentEntries) =>
      currentEntries.filter((entry) => !isToday(new Date(entry.createdAt))),
    )
  }

  return (
    <main className="min-h-svh bg-[#f7f9fb] text-slate-900">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-28 pt-4 sm:max-w-[720px] sm:px-6 sm:pb-10">
        <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">
                신생아 수유 체크
              </p>
              <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-normal text-slate-950">
                오늘 충분히 먹었을까?
              </h1>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-sky-100 text-sky-700">
              <Baby size={26} aria-hidden="true" />
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex gap-3">
            <AlertTriangle
              className="mt-0.5 shrink-0"
              size={20}
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed">
              기록과 계산 보조 도구입니다. 조산아, 저체중아, 황달, 심한
              구토, 탈수 의심, 체중 증가 부진은 의료진 상담을 우선하세요.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <label className="col-span-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-sm font-semibold text-slate-600">
              출생일
            </span>
            <div className="mt-3 flex items-center gap-3">
              <input
                className="h-12 min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 text-base font-bold outline-none focus:border-sky-500 focus:bg-white"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
              <div className="rounded-md bg-sky-50 px-3 py-2 text-right text-sky-800">
                <p className="text-xs font-semibold">생후</p>
                <p className="text-base font-bold">{ageDays}일</p>
              </div>
            </div>
          </label>

          <label className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-sm font-semibold text-slate-600">
              현재 몸무게
            </span>
            <div className="mt-3 flex items-end gap-2">
              <input
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-2xl font-bold outline-none focus:border-sky-500 focus:bg-white"
                inputMode="decimal"
                min="2"
                max="8"
                step="0.1"
                type="number"
                value={weight}
                onChange={(event) => setWeight(Number(event.target.value))}
              />
              <span className="pb-3 text-sm font-semibold text-slate-500">
                kg
              </span>
            </div>
          </label>

          <label className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-sm font-semibold text-slate-600">
              목표 횟수
            </span>
            <div className="mt-3 flex items-end gap-2">
              <input
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-2xl font-bold outline-none focus:border-sky-500 focus:bg-white"
                inputMode="numeric"
                min="7"
                max="12"
                step="1"
                type="number"
                value={feedsPerDay}
                onChange={(event) =>
                  setFeedsPerDay(
                    Math.min(12, Math.max(7, Number(event.target.value))),
                  )
                }
              />
              <span className="pb-3 text-sm font-semibold text-slate-500">
                회
              </span>
            </div>
          </label>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              하루 권장량
            </p>
            <p className="mt-1 text-3xl font-bold tracking-normal text-slate-950">
              {formatMl(dailyMin)}~{formatMl(dailyMax)}
            </p>
            <p className="mt-2 text-sm font-semibold text-sky-700">
              {guide.mode} · 분유 하루 상한 {formatMl(1000)}
            </p>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <SummaryMetric
              icon={<CalendarDays size={16} aria-hidden="true" />}
              label="생후 일수"
              value={`${ageDays}일`}
            />
            <SummaryMetric
              icon={<Droplets size={16} aria-hidden="true" />}
              label="오늘 총량"
              value={formatMl(totalAmount)}
            />
            <SummaryMetric
              icon={<Clock3 size={16} aria-hidden="true" />}
              label="다음 예상"
              value={nextFeedText}
            />
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-600">
            {guide.note} 1회 권장량은{' '}
            <strong className="text-slate-900">
              {formatMl(roundToFive(perFeedMin))}~
              {formatMl(roundToFive(perFeedMax))}
            </strong>
            입니다.
          </div>
        </section>

        <AdSlot label="광고 영역" />

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-normal text-slate-950">
                수유량 추가
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {todayEntries.length}회 입력 · 남은 최소 목표량{' '}
                {formatMl(remainingAmount)}
              </p>
            </div>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 active:bg-slate-100"
              type="button"
              onClick={resetToday}
              aria-label="오늘 기록 초기화"
              title="오늘 기록 초기화"
            >
              <RotateCcw size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {quickAmounts.map((amount) => (
              <button
                className={`rounded-md border px-2 py-3 text-sm font-bold active:bg-sky-50 ${
                  feedAmount === amount
                    ? 'border-sky-500 bg-sky-50 text-sky-800'
                    : 'border-slate-200 bg-slate-50 text-slate-800'
                }`}
                type="button"
                key={amount}
                onClick={() => setFeedAmount(amount)}
              >
                {amount}ml
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">직접 입력 수유량</span>
              <input
                className="h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-base font-semibold outline-none focus:border-sky-500 focus:bg-white"
                inputMode="numeric"
                min="0"
                step="5"
                type="number"
                value={feedAmount}
                onChange={(event) => setFeedAmount(Number(event.target.value))}
              />
            </label>
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white active:bg-slate-700"
              type="button"
              onClick={() => addFeed()}
            >
              <Plus size={18} aria-hidden="true" />
              추가
            </button>
          </div>
        </section>

        <AdSlot label="광고 영역" />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-[480px] gap-2">
          <input
            className="h-12 min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 text-base font-semibold outline-none focus:border-sky-500 focus:bg-white"
            inputMode="numeric"
            min="0"
            step="5"
            type="number"
            value={feedAmount}
            onChange={(event) => setFeedAmount(Number(event.target.value))}
            aria-label="빠른 수유량 입력"
          />
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-sky-600 px-5 text-sm font-bold text-white active:bg-sky-700"
            type="button"
            onClick={() => addFeed()}
          >
            <Plus size={18} aria-hidden="true" />
            추가
          </button>
        </div>
      </div>
    </main>
  )
}

function SummaryMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-3">
      <div className="mx-auto flex w-fit items-center gap-1 text-slate-500">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-2 text-sm font-bold text-slate-950">{value}</p>
    </div>
  )
}

function AdSlot({ label }: { label: string }) {
  return (
    <aside className="grid min-h-24 place-items-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-slate-400">
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="mt-1 text-xs">320x100 / 728x90</p>
      </div>
    </aside>
  )
}

export default App
