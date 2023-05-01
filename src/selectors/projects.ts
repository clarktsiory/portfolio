import { getCollection } from 'astro:content'
import dayjs from 'dayjs'
import { pipe } from 'fp-ts/lib/function'
import * as O from 'fp-ts/lib/Option'
import * as RA from 'fp-ts/lib/ReadonlyArray'
import * as S from 'fp-ts/lib/State'
import pluralize from 'pluralize'
import { ProjectSchema } from '../content/config'
import { languages } from '../i18n/ui'
import { useTranslations } from '../i18n/utils'
import { CardProps } from '../types/Card.types'

const getProjectTitle =
  <S>(k: (arg0: string) => S) =>
  ({ role, company }: ProjectSchema) =>
    `${role} ${k('projects.at')} ${company}`

const getProjectUrl = (lang: keyof typeof languages) => (slug: string) =>
  `/${lang}/project/${slug.split('/')[1]}`

class Range {
  constructor(public startDate: Date, public endDate?: Date | null) {}
}
Range.prototype.valueOf = function () {
  // comparing intervals: starting date, then ending date. If one is missing, it's considered infinite (latest)
  return (
    this.startDate.valueOf() +
    (this.endDate != undefined ? this.endDate.valueOf() : Infinity)
  )
}

// Thresholds to 'days' as highest resolution unit
const TimeUnits = ['days', 'weeks', 'months', 'years'] as const
type TimeDiff = { [K in (typeof TimeUnits)[number]]: number }
const modByUnit: Record<keyof TimeDiff, number> = {
  days: 7,
  weeks: 4,
  months: 12,
  years: 0,
}

const timeDiffComputation: S.State<TimeDiff, void> = pipe(
  TimeUnits,
  S.traverseArray((unit) => {
    type K = typeof TimeUnits
    const modulo = modByUnit[unit]
    const optNextUnit = pipe(
      TimeUnits,
      RA.findIndex((u: K[number]) => u === unit),
      O.map((i) => i + 1),
      O.filter((i) => i < TimeUnits.length),
      O.map((i) => TimeUnits[i])
    )
    // compute division and modulo from current unit
    return pipe(
      optNextUnit,
      O.fold(
        () => S.of<TimeDiff, void>(undefined),
        (nextUnit) =>
          S.modify((s: TimeDiff) => ({
            ...s,
            [unit]: s[unit] % modulo,
            [nextUnit]: Math.floor(s[unit] / modulo) + s[nextUnit],
          }))
      )
    )
  }),
  S.map(() => undefined)
)

// drop the day part, ex: 1 month 3 weeks
const formatTimeDiff =
  (t: ReturnType<typeof useTranslations>) => (diff: TimeDiff) =>
    Object.entries(diff)
      .map(
        ([unit, value]) => [unit as (typeof TimeUnits)[number], value] as const
      )
      .filter(([, value]) => value > 0)
      .slice(1)
      .map(([unit, value]) => pluralize(t(`time.${unit}`), value, true))
      .reverse()
      .join(' ')

export class ProjectService {
  constructor(private readonly lang: keyof typeof languages) {}

  async getProjectCards(): Promise<CardProps[]> {
    const t = useTranslations(this.lang)
    return this.getProjects().then((projects) =>
      projects.map(({ slug, data }) => ({
        title: getProjectTitle(t)(data),
        url: getProjectUrl(this.lang)(slug),
        desc: data.description,
        tags: data.technologies,
      }))
    )
  }
  async getProjectTimelines() {
    const t = useTranslations(this.lang)

    return this.getProjects().then((projects) =>
      projects.map(({ slug, data }) => {
        const startDate = dayjs(new Date(data.startDate))
        const endDate = dayjs(
          data.endDate == undefined ? new Date() : new Date(data.endDate)
        )
        const diffDays = endDate.diff(startDate, 'day')
        const states = pipe(
          timeDiffComputation,
          S.execute({ days: diffDays, weeks: 0, months: 0, years: 0 })
        )

        const formatter = new Intl.DateTimeFormat(this.lang, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })

        const formattedStartDate = formatter.format(startDate.toDate())
        const formattedEndDate = formatter.format(endDate.toDate())
        const formattedDuration = formatTimeDiff(t)(states)

        const formattedDateRange =
          this.lang === 'en'
            ? `From ${formattedStartDate} to ${formattedEndDate} (${formattedDuration})`
            : `Du ${formattedStartDate} au ${formattedEndDate} (${formattedDuration})`
        return {
          title: getProjectTitle(t)(data),
          subtitle: formattedDateRange,
          desc: data.description,
          src: getProjectUrl(this.lang)(slug),
        }
      })
    )
  }

  private async getProjects() {
    const projects = await getCollection('project', ({ slug }) =>
      slug.startsWith(this.lang + '/')
    )

    // sort by date
    return projects.sort(
      (
        { data: { startDate: startDateA, endDate: endDateA } },
        { data: { startDate: startDateB, endDate: endDateB } }
      ) => {
        const aRange = new Range(startDateA, endDateA)
        const bRange = new Range(startDateB, endDateB)
        return aRange > bRange ? 1 : -1
      }
    )
  }
}

export interface ProjectService {
  getProjectCards(): Promise<CardProps[]>
  getProjectTimelines(): Promise<
    {
      title: string
      subtitle: string
      desc: string
      src: string
    }[]
  >
}
