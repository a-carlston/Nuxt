// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: [
    '~/assets/css/main.css',
    '~/assets/css/neumorphic.css'
  ],
  app: {
    head: {
      script: [
        {
          // Blocking script to prevent theme flash - runs before anything renders
          innerHTML: `(function(){try{var t=localStorage.getItem('neu-theme')||document.cookie.match(/neu-theme=([^;]+)/)?.[1];var p=localStorage.getItem('neu-palette')||document.cookie.match(/neu-palette=([^;]+)/)?.[1]||'corporate';var d=document.documentElement;if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark');d.setAttribute('data-theme','dark')}else{d.setAttribute('data-theme','light')}d.setAttribute('data-palette',p)}catch(e){}})()`,
          type: 'text/javascript'
        }
      ]
    }
  },
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts'
  },
  features: {
    inlineStyles: true // Inline critical CSS in SSR HTML
  },
  runtimeConfig: {
    // Server-only (not exposed to client)
    databaseUrl: process.env.DATABASE_URL,
    encryptionKey: process.env.ENCRYPTION_KEY,
    // Neon API (for tenant branching)
    neonApiKey: process.env.NEON_API_KEY,
    neonProjectId: process.env.NEON_PROJECT_ID,
    // Cloudflare R2 (S3-compatible)
    r2AccountId: process.env.R2_ACCOUNT_ID,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2BucketName: process.env.R2_BUCKET_NAME || 'optivo',
    public: {
      r2PublicUrl: process.env.NUXT_PUBLIC_R2_URL || ''
    }
  }
})
