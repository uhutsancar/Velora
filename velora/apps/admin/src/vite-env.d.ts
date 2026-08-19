/// <reference types="vite/client" />

/**
 * Typed environment variables.
 *
 * Without this, `import.meta.env.VITE_*` is `any`, which silently defeats
 * `no-unsafe-argument` everywhere `env` is consumed.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_MEDIA_ORIGIN?: string;
  readonly VITE_STOREFRONT_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_CURRENCY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
