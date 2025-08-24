const admin = require('firebase-admin');

// Инициализация Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "razrabotka-b61bc",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    databaseURL: "https://razrabotka-b61bc.firebaseio.com"
  });
}

const db = admin.firestore();

// Функция для получения данных из Firebase
async function getSiteData() {
  try {
    const [homeDoc, servicesSnapshot, portfolioSnapshot, blogSnapshot, contactSnapshot] = await Promise.all([
      db.collection('home').doc('content').get(),
      db.collection('services').get(),
      db.collection('portfolio').get(),
      db.collection('blog').get(),
      db.collection('contact').get()
    ]);

    const processDocData = (data) => {
      if (data && typeof data.schemaJsonLd === 'string' && data.schemaJsonLd.trim().startsWith('{')) {
        try {
          data.schemaJsonLd = JSON.parse(data.schemaJsonLd);
        } catch (e) {
          console.error('Failed to parse schemaJsonLd string:', e);
          data.schemaJsonLd = {};
        }
      }
      return data;
    };

    return {
      home: homeDoc.exists ? processDocData(homeDoc.data()) : {},
      services: servicesSnapshot.docs.map(doc => ({ id: doc.id, ...processDocData(doc.data()) })),
      portfolio: portfolioSnapshot.docs.map(doc => ({ id: doc.id, ...processDocData(doc.data()) })),
      blog: blogSnapshot.docs.map(doc => ({ id: doc.id, ...processDocData(doc.data()) })),
      contact: contactSnapshot.docs.map(doc => ({ id: doc.id, ...processDocData(doc.data()) }))
    };
  } catch (error) {
    console.error("Error loading data from Firebase:", error);
    return {
      home: { h1: "Digital Craft", subtitle: "Professional websites for small businesses", lang: "en" },
      services: [], portfolio: [], blog: [], contact: []
    };
  }
}

// Функция для форматирования контента
function formatContentHtml(content) {
  if (!content) return '';
  let processedContent = content.replace(/\r\n/g, '\n');
  const blocks = processedContent.split(/\n{2,}/);
  const html = blocks.map(block => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return '';
    
    const youtubeRegex = /^https?:\/\/(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch?v=|watch\?.*&v=|shorts\/))([a-zA-Z0-9_-]{11}).*$/;
    const imageRegex = /^https?:\/\/[^<>"']+\.(?:jpg|jpeg|png|gif|webp|svg)\s*$/i;
    
    const youtubeMatch = trimmedBlock.match(youtubeRegex);
    const imageMatch = trimmedBlock.match(imageRegex);
    
    if (/^<(p|div|h[1-6]|ul|ol|li|blockquote|hr|table|pre)/i.test(trimmedBlock)) {
      return trimmedBlock;
    } else if (youtubeMatch && youtubeMatch[1]) {
      const videoId = youtubeMatch[1];
      return `<div class="embedded-video" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; margin: 1.5em 0; border-radius: 4px; border: 1px solid var(--color-border);"><iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    } else if (imageMatch) {
      return `<p style="margin: 1.5em 0;"><img src="${trimmedBlock}" alt="Embedded content" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; border: 1px solid var(--color-border);" /></p>`;
    } else {
      return `<p>${trimmedBlock.replace(/\n/g, '<br>')}</p>`;
    }
  }).join('');
  return html;
}

// Функция для генерации HTML страницы
function generatePageHTML(data, path, item = null) {
  const isDetailPage = item !== null;
  const pageData = isDetailPage ? item : data.home;
  
  const title = pageData.seoTitle || (isDetailPage ? item.title : "Digital Craft");
  const description = pageData.metaDescription || (isDetailPage ? item.description : "Professional websites for small businesses");
  const lang = pageData.lang || 'en';
  
  const ogTitle = pageData.ogTitle || pageData.seoTitle || title;
  const ogDescription = pageData.ogDescription || pageData.metaDescription || description;
  const ogImage = pageData.ogImage || (item?.media?.find(url => !/youtube|vimeo/.test(url)) || '');
  
  const canonicalUrl = `https://digital-craft-tbilisi.netlify.app${path}`;
  
  let schemaJsonLd = {};
  if (pageData.schemaJsonLd && typeof pageData.schemaJsonLd === 'object') {
    schemaJsonLd = pageData.schemaJsonLd;
  }
  
  const schemaScript = Object.keys(schemaJsonLd).length > 0 
    ? `<script type="application/ld+json">${JSON.stringify(schemaJsonLd)}</script>`
    : '';

  const content = isDetailPage 
    ? generateDetailPageContent(item, data)
    : generateHomePageContent(data);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDescription}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${ogTitle}">
    <meta name="twitter:description" content="${ogDescription}">
    ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}
    
    ${schemaScript}
    
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore-compat.js"></script>

    <!-- Critical CSS -->
    <style>
        :root {
            --color-bg: #030409;
            --color-text: #FFFFFF;
            --color-accent: #b8d8e8;
        }
        body { 
            margin: 0; 
            padding: 0; 
            background-color: var(--color-bg); 
            color: var(--color-text);
            font-family: 'Inter', sans-serif;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }
        #loader { 
            position: fixed; 
            top: 0; left: 0; 
            width: 100%; 
            height: 100%; 
            background: var(--color-bg); 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            z-index: 10000; 
            transition: opacity 0.5s ease-out; 
        }
        #loader.hidden { opacity: 0; pointer-events: none; }
        .spinner { 
            width: 50px; 
            height: 50px; 
            border: 3px solid var(--color-accent); 
            border-radius: 50%; 
            border-top-color: transparent; 
            animation: spin 1s linear infinite; 
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>

    <!-- Async CSS -->
    <link rel="stylesheet" href="/styles.css" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="/styles.css"></noscript>
</head>
<body>
    <noscript>
        <div><img src="https://mc.yandex.ru/watch/103413242" style="position:absolute; left:-9999px;" alt=""></div>
        <h1>${title}</h1>
        <p>${description}</p>
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
        ${content}
    </main>
    
    <footer class="site-footer" id="site-footer"></footer>
    
    <!-- Main Script -->
    <script type="module" src="/main.js"></script>
    
    <!-- Yandex Metrika -->
    <script type="text/javascript">
        function loadYandexMetrika() {
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    
            ym(103413242, "init", {
                 clickmap:true,
                 trackLinks:true,
                 accurateTrackBounce:true,
                 webvisor:true
            });
        }
        setTimeout(loadYandexMetrika, 3000); 
    </script>
</body>
</html>`;
}

// Функция для генерации контента главной страницы
function generateHomePageContent(data) {
  const { home, services, portfolio, blog, contact } = data;
  
  const heroContent = `
    <section id="hero" class="hero">
      <h1>${home.h1 || 'Digital Craft'}</h1>
      ${home.subtitle ? `<div class="hero-subtitle-container">${formatContentHtml(home.subtitle)}</div>` : ''}
    </section>`;

  const servicesContent = generateSectionContent('services', 'Our Services', services);
  const portfolioContent = generateSectionContent('portfolio', 'Our Work', portfolio);
  const blogContent = generateSectionContent('blog', 'Latest Insights', blog);
  const contactContent = generateSectionContent('contact', 'Get in Touch', contact);

  return heroContent + servicesContent + portfolioContent + blogContent + contactContent;
}

// Функция для генерации контента секций
function generateSectionContent(key, title, items) {
  if (!items || items.length === 0) return '';
  
  const langOrder = ['en', 'ka', 'ua', 'ru'];
  const langNames = { en: 'English', ka: 'Georgian', ua: 'Ukrainian', ru: 'Russian' };
  
  const itemsByLang = {};
  items.forEach(item => {
    if (!itemsByLang[item.lang]) itemsByLang[item.lang] = [];
    itemsByLang[item.lang].push(item);
  });

  const desktopGridsHTML = langOrder.map(lang => {
    const langItems = itemsByLang[lang];
    if (!langItems || langItems.length === 0) return '';
    
    const slides = [];
    for (let i = 0; i < langItems.length; i += 3) {
      slides.push(langItems.slice(i, i + 3));
    }
    
    const slidesHTML = slides.map((slideItems, index) => {
      const cardsHTML = slideItems.map(item => {
        const langPrefix = item.lang ? `/${item.lang}` : '';
        const itemUrl = `${langPrefix}/${key}/${item.urlSlug}`;
        return `<a href="${itemUrl}" class="item-card floating-item">
          <div class="item-card__image" style="background-image: url('${(item.media || []).find(url => !/youtube|vimeo/.test(url)) || ''}')"></div>
          <div class="item-card__content">
            <h3>${item.title}</h3>
            <div class="card-subtitle">${item.subtitle}</div>
            <p>${item.description}</p>
          </div>
        </a>`;
      }).join('');
      return `<div class="desktop-grid-slide ${index === 0 ? 'active' : ''}">${cardsHTML}</div>`;
    }).join('');
    
    const dotsHTML = slides.length > 1 ? slides.map((_, index) => 
      `<span class="desktop-slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`
    ).join('') : '';
    
    return `<div class="desktop-language-group">
      <h4 class="desktop-lang-title">${langNames[lang]}</h4>
      <div class="desktop-carousel-container">${slidesHTML}</div>
      ${slides.length > 1 ? `<div class="desktop-slider-nav">${dotsHTML}</div>` : ''}
    </div>`;
  }).join('');

  const mobileSlidersHTML = langOrder.map(lang => {
    const langItems = itemsByLang[lang];
    if (!langItems || langItems.length === 0) return '';
    
    const slidesHTML = langItems.map((item, index) => {
      const langPrefix = item.lang ? `/${item.lang}` : '';
      const itemUrl = `${langPrefix}/${key}/${item.urlSlug}`;
      return `<a href="${itemUrl}" class="item-card ${index === 0 ? 'active' : ''}">
        <div class="item-card__image" style="background-image: url('${(item.media || []).find(url => !/youtube|vimeo/.test(url)) || ''}')"></div>
        <div class="item-card__content">
          <h3>${item.title}</h3>
          <div class="card-subtitle">${item.subtitle}</div>
          <p>${item.description}</p>
        </div>
      </a>`;
    }).join('');
    
    const dotsHTML = langItems.length > 1 ? langItems.map((_, index) => 
      `<span class="slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`
    ).join('') : '';
    
    return `<div class="language-slider-block">
      <div class="cross-fade-slider">${slidesHTML}</div>
      <div class="slider-nav">${dotsHTML}</div>
    </div>`;
  }).join('');

  return `<section id="${key}">
    <div class="animated-container">
      <h2>${title}</h2>
    </div>
    <div class="desktop-grid-wrapper">${desktopGridsHTML}</div>
    <div class="mobile-sliders-container">${mobileSlidersHTML}</div>
  </section>`;
}

// Функция для генерации контента детальной страницы
function generateDetailPageContent(item, data) {
  const formattedContent = formatContentHtml(item.mainContent);
  
  const relatedItems = generateRelatedPosts(item, data);
  
  return `<section>
    <div class="detail-page-header">
      <h1 class="fade-in-up" style="animation-delay: 0.5s;">${item.h1 || item.title}</h1>
      ${item.price ? `<div class="detail-price fade-in-up" style="animation-delay: 0.7s;">${item.price}</div>` : ''}
    </div>
    <div class="detail-content">${formattedContent}</div>
  </section>
  ${relatedItems}`;
}

// Функция для генерации связанных постов
function generateRelatedPosts(currentItem, data) {
  const pool = [
    ...data.services.map(i => ({ ...i, collection: 'services' })),
    ...data.blog.map(i => ({ ...i, collection: 'blog' }))
  ];
  
  const relatedItems = pool
    .filter(item => item.lang === currentItem.lang && !(item.collection === currentItem.collection && item.urlSlug === currentItem.urlSlug))
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  if (relatedItems.length === 0) return '';

  const itemsHTML = relatedItems.map(item => {
    const langPrefix = item.lang ? `/${item.lang}` : '';
    const itemUrl = `${langPrefix}/${item.collection}/${item.urlSlug}`;
    return `<a href="${itemUrl}" class="item-card floating-item">
      <div class="item-card__image" style="background-image: url('${(item.media || []).find(url => !/youtube|vimeo/.test(url)) || ''}')"></div>
      <div class="item-card__content">
        <h3>${item.title}</h3>
        <div class="card-subtitle">${item.subtitle}</div>
        <p>${item.description}</p>
      </div>
    </a>`;
  }).join('');

  return `<section id="related-posts">
    <h2 class="fade-in-up">You Might Also Like</h2>
    <div class="item-grid">${itemsHTML}</div>
  </section>`;
}

// Основная функция обработчика
exports.handler = async (event, context) => {
  try {
    const path = event.path;
    
    // Получаем данные из Firebase
    const siteData = await getSiteData();
    
    // Определяем тип страницы
    const detailPageRegex = /^\/(?:([a-z]{2})\/)?(services|portfolio|blog|contact)\/([a-zA-Z0-9-]+)\/?$/;
    const match = path.match(detailPageRegex);
    
    let item = null;
    if (match) {
      const [, lang, collection, slug] = match;
      const currentLang = lang || 'en';
      item = siteData[collection]?.find(d => d.urlSlug === slug && d.lang === currentLang);
      
      if (!item) {
        return {
          statusCode: 404,
          body: generatePageHTML(siteData, path, null),
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
          }
        };
      }
    }
    
    // Генерируем HTML
    const html = generatePageHTML(siteData, path, item);
    
    return {
      statusCode: 200,
      body: html,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'index, follow'
      }
    };
    
  } catch (error) {
    console.error('Error in render function:', error);
    
    return {
      statusCode: 500,
      body: 'Internal Server Error',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    };
  }
};