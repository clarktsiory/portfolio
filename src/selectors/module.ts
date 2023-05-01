import { token } from 'brandi'
import { makeInjectedModule } from 'brandi-typed'
import { languages } from '../i18n/ui'
import { ProjectService } from './projects'

const projectTokens = {
  lang: token<keyof typeof languages>('Language'),
  projectService: token<ProjectService>('ProjectService'),
} as const

const module = makeInjectedModule(projectTokens)
export const selectorsModule = module.bind('projectService', (bnd) =>
  bnd.toInstance(ProjectService).inSingletonScope()
)

module.injector(ProjectService, 'lang')
