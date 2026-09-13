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

  // This site is deployed under dev.panderose.com/docs (path-based, not a
  // separate subdomain) — see staticwebapp.config.json and
  // .github/workflows/dev-docs.yml at the repo root for how the build
  // output ends up physically under /docs/ to match this baseUrl.
  url: 'https://dev.panderose.com',
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
            'https://github.com/PanderoseCore/panderose-deploy/tree/dev-docs/docs/',
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
          'https://github.com/PanderoseCore/panderose-deploy/tree/dev-docs/docs/',
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
