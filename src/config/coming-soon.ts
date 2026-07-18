export const COMING_SOON_FEATURES = {
  subscribe: {
    title: "Subscriptions are coming soon",
    message: "Email updates and publication alerts are being prepared.",
  },
  donate: {
    title: "Donations are coming soon",
    message: "A secure way to support APOLOGETICS will be available here.",
  },
  resources: {
    title: "Resources are coming soon",
    message: "Curated learning materials and references are being prepared.",
  },
  videos: {
    title: "Videos are coming soon",
    message: "Talks, interviews, and educational videos are being prepared.",
  },
  speakers: {
    title: "Speakers are coming soon",
    message: "Speaker profiles and contribution details are being prepared.",
  },
  faq: {
    title: "Frequently asked questions are coming soon",
    message: "Answers to common questions will be published here.",
  },
  "privacy-policy": {
    title: "Our privacy policy is coming soon",
    message: "The public privacy notice is being finalized.",
  },
  terms: {
    title: "Terms of use are coming soon",
    message: "The terms for using this platform are being finalized.",
  },
  registration: {
    title: "Public registration is coming soon",
    message: "Account registration is not available yet.",
  },
} as const;

export const COMING_SOON_FEATURE_KEYS = [
  "subscribe",
  "donate",
  "resources",
  "videos",
  "speakers",
  "faq",
  "privacy-policy",
  "terms",
  "registration",
] as const;

export type ComingSoonFeature = (typeof COMING_SOON_FEATURE_KEYS)[number];

export function comingSoonHref(feature: ComingSoonFeature): string {
  return `/coming-soon?feature=${encodeURIComponent(feature)}`;
}
