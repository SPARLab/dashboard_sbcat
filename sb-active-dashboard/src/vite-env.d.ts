/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_VOLUME_PAGE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
