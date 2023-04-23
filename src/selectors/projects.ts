import { getCollection } from "astro:content";
import { ProjectSchema } from "../content/config";
import { languages } from "../i18n/ui";
import { useTranslations } from "../i18n/utils";

const getProjectTitle = (k: ((arg0: string) => any)) => ({ role, company }: ProjectSchema) =>
  `${role} ${k('projects.at')} ${company}`;

const getProjectUrl = (lang: keyof typeof languages) => (slug: string) => 
  `/${lang}/project/${slug.split("/")[1]}`;


class Range {
  constructor(public startDate: Date, public endDate?: Date | undefined) {}
}
Range.prototype.valueOf = function () {
  // comparing intervals: starting date, then ending date. If one is missing, it's considered infinite (latest)
  return this.startDate.valueOf() + (this.endDate ? this.endDate.valueOf() : Infinity);
}

export const getProjects = async (lang: keyof typeof languages) => {
  const projects = await getCollection("project", ({ slug }) =>
    slug.startsWith(lang + "/")
  );
  
  // sort by date
  return projects.sort(({ data: { startDate: startDateA, endDate: endDateA} }, { data: { startDate: startDateB, endDate: endDateB} }) => {
    const aRange = new Range(startDateA, endDateA);
    const bRange = new Range(startDateB, endDateB);
    return aRange > bRange ? 1 : -1;
  });
}

// title, img, desc, url, badge, tags, target = '_blank' 
export const getProjectCards = async (lang: keyof typeof languages) => {
  const t = useTranslations(lang);
  return getProjects(lang).then(projects => projects.map(({ slug, data })=> ({
    title: getProjectTitle(t)(data),
    url: getProjectUrl(lang)(slug),
    desc: data.description,
    tags: data.technologies
  })));
}


// title, subtitle, desc, src = null
export const getProjectTimelines = async (lang: keyof typeof languages) => {
  const t = useTranslations(lang);

  return getProjects(lang).then(projects => projects.map(({ slug, data }) => {
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : new Date();
    const diffTime = Math.abs((endDate as any) - (startDate as any));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.ceil(diffDays / 30);

    const formatter = new Intl.DateTimeFormat(lang === "en" ? 'en-US' : 'fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const formattedStartDate = formatter.format(startDate);
    const formattedEndDate = formatter.format(endDate);
    const month = lang === 'en' ? 'month' : 'mois';
    const formattedDuration = `${diffMonths} ${month}${diffMonths > 1 && lang != 'fr' ? 's' : ''}`;

    const formattedDateRange =
      lang === 'en'
        ? `From ${formattedStartDate} to ${formattedEndDate} (${formattedDuration})`
        : `De ${formattedStartDate} à ${formattedEndDate} (${formattedDuration})`;
    return {
      title: getProjectTitle(t)(data),
      subtitle: formattedDateRange,
      desc: data.description,
      src: getProjectUrl(lang)(slug)
    }
  }));
}