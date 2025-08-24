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
    return {
      services: [],
      portfolio: [],
      blog: [],
      contact: []
    };
  }
}

// Функция для генерации XML sitemap
function generateSitemap(siteData) {
  const baseUrl = 'https://digital-craft-tbilisi.netlify.app';
  const currentDate = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Главная страница -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`;
  
  // Добавляем страницы услуг
  if (siteData.services && siteData.services.length > 0) {
    siteData.services.forEach(service => {
      const url = `${baseUrl}/${service.lang || 'en'}/services/${service.urlSlug}`;
      const lastmod = service.updatedAt || service.createdAt || currentDate;
      xml += `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
  }
  
  // Добавляем страницы портфолио
  if (siteData.portfolio && siteData.portfolio.length > 0) {
    siteData.portfolio.forEach(project => {
      const url = `${baseUrl}/${project.lang || 'en'}/portfolio/${project.urlSlug}`;
      const lastmod = project.updatedAt || project.createdAt || currentDate;
      xml += `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });
  }
  
  // Добавляем страницы блога
  if (siteData.blog && siteData.blog.length > 0) {
    siteData.blog.forEach(post => {
      const url = `${baseUrl}/${post.lang || 'en'}/blog/${post.urlSlug}`;
      const lastmod = post.updatedAt || post.createdAt || currentDate;
      xml += `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });
  }
  
  // Добавляем страницы контактов
  if (siteData.contact && siteData.contact.length > 0) {
    siteData.contact.forEach(contact => {
      const url = `${baseUrl}/${contact.lang || 'en'}/contact/${contact.urlSlug}`;
      const lastmod = contact.updatedAt || contact.createdAt || currentDate;
      xml += `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
    });
  }
  
  xml += `
</urlset>`;
  
  return xml;
}

// Основная функция обработчика
exports.handler = async (event, context) => {
  try {
    // Получаем данные из Firestore
    const siteData = await getSiteData();
    
    // Генерируем sitemap
    const sitemap = generateSitemap(siteData);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'index, follow'
      },
      body: sitemap
    };
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Возвращаем базовый sitemap в случае ошибки
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://digital-craft-tbilisi.netlify.app/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      },
      body: fallbackSitemap
    };
  }
};