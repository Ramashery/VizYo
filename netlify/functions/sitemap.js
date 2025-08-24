const admin = require('firebase-admin');

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

async function getSiteData() {
  try {
    const [homeDoc, servicesSnapshot, portfolioSnapshot, blogSnapshot, contactSnapshot] = await Promise.all([
      db.collection('home').doc('content').get(),
      db.collection('services').get(),
      db.collection('portfolio').get(),
      db.collection('blog').get(),
      db.collection('contact').get()
    ]);

    return {
      home: homeDoc.exists ? homeDoc.data() : {},
      services: servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      portfolio: portfolioSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      blog: blogSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      contact: contactSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
  } catch (error) {
    console.error("Error loading data from Firebase:", error);
    return {
      home: {},
      services: [], portfolio: [], blog: [], contact: []
    };
  }
}

function generateSitemap(siteData) {
  const baseUrl = 'https://digital-craft-tbilisi.netlify.app';
  const currentDate = new Date().toISOString();
  
  let urls = [
    `<url>
      <loc>${baseUrl}/</loc>
      <lastmod>${currentDate}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>`
  ];

  const collections = ['services', 'portfolio', 'blog', 'contact'];
  collections.forEach(collection => {
    siteData[collection].forEach(item => {
      if (item.urlSlug && item.lang) {
        const langPrefix = item.lang ? `/${item.lang}` : '';
        const url = `${baseUrl}${langPrefix}/${collection}/${item.urlSlug}`;
        
        urls.push(`<url>
          <loc>${url}</loc>
          <lastmod>${currentDate}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>`);
      }
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('\n  ')}
</urlset>`;
}

exports.handler = async (event, context) => {
  try {
    const siteData = await getSiteData();
    const sitemap = generateSitemap(siteData);
    
    return {
      statusCode: 200,
      body: sitemap,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'index, follow'
      }
    };
  } catch (error) {
    console.error('Error in sitemap function:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    };
  }
};
