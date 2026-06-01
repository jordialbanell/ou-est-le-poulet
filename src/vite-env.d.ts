/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME: string;
  // API key/secret are NOT used client-side — unsigned uploads only need the
  // cloud name + preset. They're declared for completeness but never imported.
  readonly VITE_CLOUDINARY_API_KEY: string;
  readonly VITE_CLOUDINARY_API_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
