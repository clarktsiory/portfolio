import { AstroGlobal } from 'astro'
import { token } from 'brandi'
import { makeInjectedModule } from 'brandi-typed'

export const commonTokens = {
  astro: token<AstroGlobal>('Astro'),
} as const

export const baseModule = makeInjectedModule(commonTokens)
