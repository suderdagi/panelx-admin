/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** PostHog project API key. Analytics is disabled when it's missing. */
  readonly VITE_POSTHOG_KEY?: string
  /** PostHog host, defaults to the EU cloud. */
  readonly VITE_POSTHOG_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
