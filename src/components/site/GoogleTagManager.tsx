import Script from "next/script";

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,12}$/;

/**
 * Injects the Google Tag Manager snippet on the public site.
 * Only the container ID is configurable - all other tags (GA4, Meta
 * Pixel, LinkedIn, etc.) are managed inside the GTM container itself.
 * The ID is strictly validated so settings can never inject arbitrary
 * script.
 */
export function GoogleTagManager({ gtmId }: { gtmId: string }) {
  const id = gtmId.trim().toUpperCase();
  if (!GTM_ID_PATTERN.test(id)) return null;
  return (
    <>
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${id}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
