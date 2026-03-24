import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/overview">
            Open HomeForge Documentation
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="HomeForge wiki documentation for overview, backend, frontend, and API usage.">
      <HomepageHeader />
      <main className="container margin-vert--lg">
        <div className="row">
          <div className="col col--6 margin-bottom--md">
            <h2>Overview</h2>
            <p>Product scope, architecture, and high-level guidance.</p>
            <Link to="/overview">Go to Overview</Link>
          </div>
          <div className="col col--6 margin-bottom--md">
            <h2>Backend Documentation</h2>
            <p>Django service design, models, and backend workflows.</p>
            <Link to="/backend-documentation">Go to Backend Docs</Link>
          </div>
          <div className="col col--6 margin-bottom--md">
            <h2>Frontend Documentation</h2>
            <p>Next.js architecture, UI patterns, and client-side behavior.</p>
            <Link to="/frontend-documentation">Go to Frontend Docs</Link>
          </div>
          <div className="col col--6 margin-bottom--md">
            <h2>API Usage Documentation</h2>
            <p>Endpoint usage examples, auth flow, and integration patterns.</p>
            <Link to="/api-usage-documentation">Go to API Usage</Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}
