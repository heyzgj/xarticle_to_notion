import type { Pipeline, SiteProfile } from './types';

export function createPipeline(profiles: SiteProfile[] = [], fallback?: SiteProfile): Pipeline {
  return {
    profiles,
    fallback,
    async run(doc, url) {
      const profile = profiles.find((p) => p.match(url));
      if (profile) return profile.extract(doc, url);
      return fallback?.extract(doc, url) ?? null;
    },
  };
}
