// Refresh Google ad counts for India.
// 1. Open https://adstransparency.google.com/?region=IN in a browser.
// 2. Open DevTools > Console, paste this whole file, press Enter.
// 3. Keep the tab in front. A JSON file downloads at the end.
// 4. In the dashboard, click "Load newer data (JSON)" and pick that file.
//
// It reads one page at a time with a pause, and stops as soon as Google
// answers "429 too many requests". Do not shorten the pause: wait and rerun.
(async () => {
  const DOMAINS = ['flipkart.com','amazon.in','meesho.com','myntra.com','ajio.com','nykaa.com','mamaearth.in','sugarcosmetics.com','boat-lifestyle.com','lenskart.com','caratlane.com','tanishq.co.in','zomato.com','swiggy.com','blinkit.com','zeptonow.com','bigbasket.com','groww.in','zerodha.com','angelone.in','upstox.com','paytm.com','phonepe.com','cred.club','policybazaar.com','bajajfinserv.in','pw.live','unacademy.com','upgrad.com','simplilearn.com','makemytrip.com','goibibo.com','ixigo.com','cleartrip.com','oyorooms.com','marutisuzuki.com','tatamotors.com','auto.mahindra.com','hyundai.com','jio.com','airtel.in','myvi.in','nobroker.in','magicbricks.com','99acres.com','naukri.com','apna.co','1mg.com','pharmeasy.in','apollo247.com','urbancompany.com','pepperfry.com','wakefit.co'];
  const FILTERS = { total: '', text: '&format=TEXT', image: '&format=IMAGE', video: '&format=VIDEO' };
  const PAUSE_MS = 7000;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // "~20k" -> 20000, "~1.5M" -> 1500000, "84" -> 84
  const toNumber = s => {
    const m = String(s).replace(/[~,]/g, '').match(/^([\d.]+)([kKmM]?)$/);
    return m ? Math.round(parseFloat(m[1]) * ({ k: 1e3, m: 1e6 }[m[2].toLowerCase()] || 1)) : null;
  };

  const read = query => new Promise(resolve => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:absolute;left:-3000px;width:1200px;height:900px';
    frame.src = '/?region=IN&' + query;
    document.body.appendChild(frame);
    const started = Date.now();
    const timer = setInterval(() => {
      let text = '';
      try { text = frame.contentDocument.body.innerText; } catch (e) {}
      const count = text.match(/(~?[\d.,]+[kKmM]?)\s+ads?\b/);
      const none = /No ads found/i.test(text);
      const limited = /429\./.test(text);
      if (count || none || limited || Date.now() - started > 30000) {
        clearInterval(timer);
        frame.remove();
        resolve(limited ? 'LIMIT' : count ? toNumber(count[1]) : none ? 0 : null);
      }
    }, 500);
  });

  const google = {};
  let stopped = false;
  outer: for (const [key, filter] of Object.entries(FILTERS)) {
    for (const domain of DOMAINS) {
      const value = await read('domain=' + domain + filter);
      if (value === 'LIMIT') { stopped = true; break outer; }
      if (value !== null) (google[domain] ||= {})[key] = value;
      console.log(domain, key, value);
      await sleep(PAUSE_MS);
    }
  }

  const out = { snapshot: new Date().toISOString().slice(0, 10), google };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
  link.download = 'google_ads_' + out.snapshot + '.json';
  link.click();
  console.log(stopped ? 'Stopped: Google rate limit. Partial file saved; rerun later.' : 'Done.');
})();
