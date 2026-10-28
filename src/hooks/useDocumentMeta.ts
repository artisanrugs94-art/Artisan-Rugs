import { useEffect } from 'react';
import { useStore } from '../context/useStore';

interface DocumentMetaOptions {
  title: string;
  description: string;
  image?: string;
  ogType?: 'website' | 'product';
  priceAmount?: string;
  priceCurrency?: string;
  availability?: 'instock' | 'preorder';
  jsonLd?: Record<string, unknown>;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useDocumentMeta(opts: DocumentMetaOptions) {
  const gscVerification = useStore((s) => s.settings.googleSearchConsoleVerification);
  const primaryDomain = useStore((s) => s.settings.primaryDomain);
  const cookieConsent = useStore((s) => s.cookieConsent);
  const metaPixelCfg = useStore((s) => s.settings.integrations?.meta_pixel);
  const ga4Cfg = useStore((s) => s.settings.integrations?.ga4);

  useEffect(() => {
    document.title = opts.title;
    upsertMeta('name', 'description', opts.description);
    upsertMeta('property', 'og:title', opts.title);
    upsertMeta('property', 'og:description', opts.description);
    upsertMeta('property', 'og:type', opts.ogType || 'website');
    upsertMeta('name', 'twitter:title', opts.title);
    upsertMeta('name', 'twitter:description', opts.description);

    if (gscVerification && gscVerification.trim()) {
      upsertMeta('name', 'google-site-verification', gscVerification.trim());
    }

    if (opts.image) {
      const fullImg = opts.image.startsWith('http')
        ? opts.image
        : `${window.location.origin}${opts.image}`;
      upsertMeta('property', 'og:image', fullImg);
      upsertMeta('name', 'twitter:image', fullImg);
    }

    if (opts.priceAmount && opts.priceCurrency) {
      upsertMeta('property', 'product:price:amount', opts.priceAmount);
      upsertMeta('property', 'product:price:currency', opts.priceCurrency);
      upsertMeta('property', 'og:availability', opts.availability || 'instock');
    }

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    const cleanDomain = (primaryDomain || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const canonicalOrigin =
      cleanDomain && window.location.hostname.includes(cleanDomain)
        ? `https://${cleanDomain}`
        : window.location.origin;
    canonical.setAttribute('href', canonicalOrigin + window.location.pathname);

    let ldScript = document.getElementById('kazumi-jsonld') as HTMLScriptElement | null;
    if (opts.jsonLd) {
      if (!ldScript) {
        ldScript = document.createElement('script');
        ldScript.id = 'kazumi-jsonld';
        ldScript.type = 'application/ld+json';
        document.head.appendChild(ldScript);
      }
      ldScript.textContent = JSON.stringify(opts.jsonLd);
    } else if (ldScript) {
      ldScript.remove();
    }

    // Consent-aware Meta Pixel & GA4 Event Firing
    if (cookieConsent === 'accepted') {
      const pixelId = metaPixelCfg?.connected ? metaPixelCfg.publicId?.trim() : '';
      if (pixelId && /^[0-9]{6,22}$/.test(pixelId)) {
        if (!document.getElementById('inkedrug-meta-pixel')) {
          const script = document.createElement('script');
          script.id = 'inkedrug-meta-pixel';
          script.async = true;
          script.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');`;
          document.head.appendChild(script);
        }
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'PageView');
          if (opts.ogType === 'product' && opts.priceAmount && opts.priceCurrency) {
            window.fbq('track', 'ViewContent', {
              content_name: opts.title,
              value: Number(opts.priceAmount),
              currency: opts.priceCurrency,
            });
          }
        }
      }

      const gaId = ga4Cfg?.connected ? ga4Cfg.publicId?.trim() : '';
      if (gaId && gaId.startsWith('G-') && !document.getElementById('inkedrug-ga4')) {
        const gScript = document.createElement('script');
        gScript.id = 'inkedrug-ga4';
        gScript.async = true;
        gScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
        document.head.appendChild(gScript);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag(...args: unknown[]) {
          window.dataLayer?.push(args);
        };
        window.gtag('js', new Date());
        window.gtag('config', gaId);
      }
    }
  }, [
    opts.title,
    opts.description,
    opts.image,
    opts.ogType,
    opts.priceAmount,
    opts.priceCurrency,
    opts.availability,
    opts.jsonLd,
    gscVerification,
    primaryDomain,
    cookieConsent,
    metaPixelCfg?.connected,
    metaPixelCfg?.publicId,
    ga4Cfg?.connected,
    ga4Cfg?.publicId,
  ]);
}
