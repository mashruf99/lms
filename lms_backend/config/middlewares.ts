//middlewares.ts
import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: [
        'http://localhost:3000',
        'https://learningmanagementsystem-self.vercel.app',
      ],
      credentials: true,
    },
  },
  {
    name: 'global::rate-limit',
    config: {},
  },
  {
    name: 'global::session-check',
    config: {},
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  {
    name: 'global::session-cap',
    config: {},
  },
  'strapi::favicon',
  'strapi::public',
];

export default config;
