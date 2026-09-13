// @ts-check
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Panderose Developer Docs',
  tagline: 'Guides, standards, and API reference for Panderose software',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // This is the SOURCE project (docs-src/). It builds to /docs at the
  // repo root, which is committed static output served at panderose.com/docs
  // — same Azure Static Web Apps resource/domain as the marketing site,
  // not a separate subdomain. See the ADR at
  // content/internal/standards/adrs/0002-single-swa-resource.md for why,
  // and content/internal/architecture/ for the actual panderose-deploy ->
  // panderose-site -> Azure pipeline (this repo does not deploy directly).
  url: 'https://panderose.com',
  baseUrl: '/docs/',

  organizationName: 'PanderoseCore',
  projectName: 'panderose-deploy',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        // This is the PUBLIC docs instance — served at /docs/ (site root
        // within this app). Content lives in content/public/.
        docs: {
          id: 'default',
          path: 'content/public',
          routeBasePath: '/',
          sidebarPath: './sidebarsPublic.js',
          editUrl:
            'https://github.com/PanderoseCore/panderose-deploy/tree/main/docs-src/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: [
    // INTERNAL docs instance — served at /docs/internal/. Content lives in
    // content/internal/. Gate this route in staticwebapp.config.json
    // (allowedRoles) once auth is configured on the Azure resource.
    [
      '@docusaurus/plugin-content-docs',
      /** @type {import('@docusaurus/plugin-content-docs').Options} */
      ({
        id: 'internal',
        path: 'content/internal',
        routeBasePath: 'internal',
        sidebarPath: './sidebarsInternal.js',
        editUrl:
          'https://github.com/PanderoseCore/panderose-deploy/tree/main/docs-src/',
      }),
    ],

    // Generates API reference pages for the PUBLIC instance from
    // specs/public/*.json — see specs/README.md for the sync contract.
    // Run `npm run gen-api-docs -- all` to (re)generate the MDX files.
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'openapi-public',
        docsPluginId: 'default',
        config: {
          publicApi: {
            specPath: 'specs/public',
            outputDir: 'content/public/api',
            sidebarOptions: {
              groupPathsBy: 'tag',
            },
          },
        },
      },
    ],

    // Same, for the INTERNAL instance from specs/internal/*.json
    // (e.g. cambium).
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'openapi-internal',
        docsPluginId: 'internal',
        config: {
          internalApi: {
            specPath: 'specs/internal',
            outputDir: 'content/internal/api',
            sidebarOptions: {
              groupPathsBy: 'tag',
            },
          },
        },
      },
    ],
  ],

  themes: ['docusaurus-theme-openapi-docs'],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/social-card.png',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Panderose Developer Docs',
        logo: {
          alt: 'Panderose logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            type: 'docSidebar',
            docsPluginId: 'internal',
            sidebarId: 'internalSidebar',
            position: 'left',
            label: 'Internal',
          },
          {
            href: 'https://panderose.com',
            label: 'panderose.com',
            position: 'right',
          },
          {
            href: 'https://github.com/PanderoseCore/panderose-deploy',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {label: 'Getting started', to: '/getting-started'},
              {label: 'Guides', to: '/guides'},
              {label: 'Internal (sign-in required)', to: '/internal'},
            ],
          },
          {
            title: 'Panderose',
            items: [
              {label: 'panderose.com', href: 'https://panderose.com'},
              {label: 'About', href: 'https://panderose.com/about'},
              {label: 'Contact', href: 'https://panderose.com/contact'},
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/PanderoseCore/panderose-deploy',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Panderose.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
      languageTabs: [
        {highlight: 'bash', language: 'curl', logoClass: 'bash'},
        {highlight: 'python', language: 'python', logoClass: 'python'},
        {highlight: 'javascript', language: 'nodejs', logoClass: 'nodejs'},
      ],
    }),
};

export default config;
