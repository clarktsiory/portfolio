import { AstroGlobal } from 'astro'
import dayjs from 'dayjs'
import { baseModule } from './di'
import { getLangFromUrl } from './i18n/utils'
import { selectorsModule } from './selectors/module'

export const bootstrap = (astro: AstroGlobal) => {
  const lang = getLangFromUrl(astro.url)
  dayjs().locale(lang).format()

  return baseModule.combine(selectorsModule).make({
    astro: (bnd) => bnd.toConstant(astro),
    lang: (bnd) => bnd.toConstant(lang),
  })
}
