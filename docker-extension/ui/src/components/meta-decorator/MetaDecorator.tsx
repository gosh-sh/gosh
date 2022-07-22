import { FunctionComponent } from "react";
import { Helmet } from 'react-helmet-async';

export const MetaDecorator: FunctionComponent<{
  title?: string,
  description?: string,
  keywords?: string,
  url?: string,
  image?: string
}> = ({
    title = "Payments Surf",
    description="", 
    keywords,
    url,
    image
  }) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Payments Surf" />
      <meta property="og:keywords" content={keywords} />
      <meta property="og:url" content={url ? "https://payments.surf/" : "https://payments.surf/" + url + "/" } />
      <meta property="og:image" content={image ? "https://payments.surf/og-covers/index.png" : `https://payments.surf/og-covers/${image}.png` } />
      <meta property="og:image" content={image ? "https://payments.surf/og-covers/index.jpg" : `https://payments.surf/og-covers/${image}.jpg` } />
      <meta property="og:locale" content="en" />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:site" content="@ever_surf" />
      <meta property="twitter:site:id" content="@ever_surf" />
      <meta property="twitter:creator" content="@ever_surf" />
      <meta property="twitter:creator:id" content="@ever_surf" />
      <meta property="twitter:image" content={image ? "https://payments.surf/og-covers/index.png" : `https://payments.surf/og-covers/${image}.png` } />
      <meta property="twitter:image" content={image ? "https://payments.surf/og-covers/index.jpg" : `https://payments.surf/og-covers/${image}.jpg` } />
    </Helmet>
  );
};

export default MetaDecorator;
