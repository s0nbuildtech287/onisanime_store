async function testParse() {
  // 1. Test AnimeCorner RSS
  const acRes = await fetch('https://animecorner.me/feed/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const acXml = await acRes.text();
  const acItems = acXml.split('<item>').slice(1, 3);
  acItems.forEach((it, i) => {
    const title = it.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] || it.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const link = it.match(/<link>([\s\S]*?)<\/link>/)?.[1];
    const img = it.match(/<img[^>]+src="([^"]+)"/)?.[1] || it.match(/url="([^"]+)"/)?.[1];
    console.log('AC', i, title?.slice(0, 50), '| IMG:', img, '| LINK:', link);
  });

  // 2. Test Lag.vn HTML
  const lagRes = await fetch('https://lag.vn/tin/anime-manga', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const lagHtml = await lagRes.text();
  const lagIdx = lagHtml.indexOf('<article') !== -1 ? lagHtml.indexOf('<article') : lagHtml.indexOf('post-item');
  console.log('Lag sample index:', lagIdx, lagHtml.slice(lagIdx, lagIdx + 600));

  // 3. Test GameK HTML
  const gkRes = await fetch('https://gamek.vn/manga-film.chn', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const gkHtml = await gkRes.text();
  const gkIdx = gkHtml.indexOf('knswli-title') !== -1 ? gkHtml.indexOf('knswli-title') : gkHtml.indexOf('box-category-item');
  console.log('GameK sample index:', gkIdx, gkHtml.slice(Math.max(0, gkIdx - 300), gkIdx + 500));
}
testParse();

