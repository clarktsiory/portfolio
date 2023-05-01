import { defineCollection, z } from 'astro:content'

const projectSchema = z.object({
  company: z.string(),
  role: z.string(),
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z
    .string()
    .nullish()
    .transform((v) => (v == '' || v == null ? null : new Date(v))),
  description: z.string(),
  technologies: z.array(z.string()),
})

export type ProjectSchema = z.infer<typeof projectSchema>

const projectCollection = defineCollection({ schema: projectSchema })

export const collections = {
  project: projectCollection,
}
