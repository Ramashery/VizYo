const admin = require('firebase-admin');

// Инициализация Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

// Данные по умолчанию (fallback)
const defaultSiteData = {
  services: [
    {
      id: 'web-development',
      title: 'Web Development',
      description: 'Professional web development services',
      content: 'We create high-quality websites and web applications.',
      urlSlug: 'web-development',
      lang: 'en',
      metaTitle: 'Web Development Services in Tbilisi',
      metaDescription: 'Professional web development services in Tbilisi, Georgia',
      image: '/assets/web-development.jpg'
    }
  ],
  portfolio: [
    {
      id: 'project-1',
      title: 'Project 1',
      description: 'A successful web project',
      content: 'This project demonstrates our expertise in web development.',
      urlSlug: 'project-1',
      lang: 'en',
      metaTitle: 'Project 1 - Portfolio',
      metaDescription: 'A successful web development project',
      image: '/assets/project-1.jpg'
    }
  ],
  blog: [
    {
      id: 'blog-post-1',
      title: 'Web Development Trends',
      description: 'Latest trends in web development',
      content: 'Exploring the latest trends in web development and technology.',
      urlSlug: 'blog-post-1',
      lang: 'en',
      metaTitle: 'Web Development Trends - Blog',
      metaDescription: 'Latest trends in web development and technology',
      image: '/assets/blog-1.jpg'
    }
  ],
  contact: [
    {
      id: 'contact-info',
      title: 'Contact Us',
      description: 'Get in touch with us',
      content: 'We are here to help you with your web development needs.',
      urlSlug: 'contact-info',
      lang: 'en',
      metaTitle: 'Contact Us - Digital Craft',
      metaDescription: 'Get in touch with our web development team',
      image: '/assets/contact.jpg'
    }
  ]
};

// Функция для получения данных из Firestore
async function getSiteData() {
  try {
    const collections = ['services', 'portfolio', 'blog', 'contact'];
    const siteData = {};
    
    for (const collection of collections) {
      const snapshot = await db.collection(collection).get();
      siteData[collection] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    return siteData;
  } catch (error) {
    console.error('Error fetching data from Firestore:', error);
    return defaultSiteData;
  }
}

// Функция для генерации HTML
function generateHTML(data, isDetailPage = false, itemData = null) {
  const baseUrl = 'https://digital-craft-tbilisi.netlify.app';
  
  // Определяем мета-теги
  let title = 'Web Development & SEO Services in Tbilisi, Georgia | Digital Craft';
  let description = 'Professional web development and SEO services based in Tbilisi. We build high-performance websites for businesses.';
  let canonicalUrl = baseUrl;
  let ogImage = `${baseUrl}/assets/og-default.jpg`;
  
  if (isDetailPage && itemData) {
    title = itemData.metaTitle || itemData.title;
    description = itemData.metaDescription || itemData.description;
    canonicalUrl = `${baseUrl}/${itemData.lang || 'en'}/${itemData.collection}/${itemData.urlSlug}`;
    ogImage = itemData.image ? `${baseUrl}${itemData.image}` : ogImage;
  }
  
  // Структурированные данные (JSON-LD)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": isDetailPage ? "Article" : "Organization",
    "name": isDetailPage ? itemData?.title : "Digital Craft",
    "description": description,
    "url": canonicalUrl,
    "image": ogImage,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Tbilisi",
      "addressCountry": "GE"
    }
  };
  
  if (isDetailPage && itemData) {
    structuredData["@type"] = "Article";
    structuredData["headline"] = itemData.title;
    structuredData["author"] = {
      "@type": "Organization",
      "name": "Digital Craft"
    };
    structuredData["publisher"] = {
      "@type": "Organization",
      "name": "Digital Craft",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/assets/logo.png`
      }
    };
    structuredData["datePublished"] = itemData.createdAt || new Date().toISOString();
    structuredData["dateModified"] = itemData.updatedAt || new Date().toISOString();
  }
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:type" content="${isDetailPage ? 'article' : 'website'}">
    <meta property="og:site_name" content="Digital Craft">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${ogImage}">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify(structuredData)}
    </script>
    
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
</head>
<body>
    <noscript>
        <div style="text-align: center; padding: 20px; background: #f0f0f0;">
            <h1>Digital Craft</h1>
            <p>Professional web development and SEO services in Tbilisi, Georgia.</p>
            <p>Please enable JavaScript to view the full website.</p>
        </div>
    </noscript>
    
    <div id="loader"><div class="spinner"></div></div>
    <iframe id="custom-background-iframe" title="Custom Background"></iframe>
    
    <button class="menu-toggle" aria-label="Toggle menu">
        <span class="bar"></span><span class="bar"></span><span class="bar"></span>
    </button>
    
    <div class="nav-overlay">
        <ul class="nav-menu"></ul>
    </div>
    
    <main>
        ${isDetailPage && itemData ? `
        <article class="detail-page">
            <header class="detail-header">
                <h1>${itemData.title}</h1>
                <p class="detail-description">${itemData.description}</p>
            </header>
            <div class="detail-content">
                ${itemData.content}
            </div>
        </article>
        ` : `
        <section class="hero">
            <h1>Professional Web Development & SEO Services</h1>
            <p>We create high-performance websites and optimize them for search engines in Tbilisi, Georgia.</p>
        </section>
        
        <section class="services">
            <h2>Our Services</h2>
            <div class="services-grid">
                ${data.services?.map(service => `
                <div class="service-card">
                    <h3>${service.title}</h3>
                    <p>${service.description}</p>
                    <a href="/${service.lang || 'en'}/services/${service.urlSlug}">Learn More</a>
                </div>
                `).join('') || ''}
            </div>
        </section>
        
        <section class="portfolio">
            <h2>Our Work</h2>
            <div class="portfolio-grid">
                ${data.portfolio?.map(project => `
                <div class="portfolio-card">
                    <h3>${project.title}</h3>
                    <p>${project.description}</p>
                    <a href="/${project.lang || 'en'}/portfolio/${project.urlSlug}">View Project</a>
                </div>
                `).join('') || ''}
            </div>
        </section>
        
        <section class="blog">
            <h2>Latest Insights</h2>
            <div class="blog-grid">
                ${data.blog?.map(post => `
                <div class="blog-card">
                    <h3>${post.title}</h3>
                    <p>${post.description}</p>
                    <a href="/${post.lang || 'en'}/blog/${post.urlSlug}">Read More</a>
                </div>
                `).join('') || ''}
            </div>
        </section>
        
        <section class="contact">
            <h2>Get in Touch</h2>
            <div class="contact-content">
                ${data.contact?.[0]?.content || 'Contact us for professional web development services.'}
            </div>
        </section>
        `}
    </main>
    
    <footer class="site-footer" id="site-footer">
        <p>&copy; 2024 Digital Craft. Professional web development services in Tbilisi, Georgia.</p>
    </footer>
    
    <script type="module" src="/main.js"></script>
    
    <!-- Yandex Metrika -->
    <script type="text/javascript">
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
        ym(103413242, "init", {
            clickmap:true,
            trackLinks:true,
            accurateTrackBounce:true
        });
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/103413242" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
</body>
</html>`;
}

// Основная функция обработчика
exports.handler = async (event, context) => {
  try {
    const path = event.path;
    const queryParams = event.queryStringParameters || {};
    
    // Получаем данные из Firestore
    const siteData = await getSiteData();
    
    // Определяем тип страницы
    const detailPageRegex = /^\/(?:([a-z]{2})\/)?(services|portfolio|blog|contact)\/([a-zA-Z0-9-]+)\/?$/;
    const match = path.match(detailPageRegex);
    
    let html;
    
    if (match) {
      // Детальная страница
      const [, lang, collection, slug] = match;
      const currentLang = lang || 'en';
      const item = siteData[collection]?.find(d => d.urlSlug === slug && d.lang === currentLang);
      
      if (item) {
        item.collection = collection;
        html = generateHTML(siteData, true, item);
      } else {
        // Если элемент не найден, возвращаем 404
        return {
          statusCode: 404,
          body: '<h1>Page Not Found</h1><p>The requested page could not be found.</p>'
        };
      }
    } else {
      // Главная страница
      html = generateHTML(siteData, false);
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'index, follow'
      },
      body: html
    };
    
  } catch (error) {
    console.error('Error in render function:', error);
    
    // Возвращаем базовую HTML страницу в случае ошибки
    const fallbackHtml = generateHTML(defaultSiteData, false);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      },
      body: fallbackHtml
    };
  }
};