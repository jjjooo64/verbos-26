 (function () {
   function loadScript(src) {
     return new Promise((resolve, reject) => {
       const s = document.createElement('script');
       s.src = src;
       s.onload = resolve;
       s.onerror = () => reject(new Error('Failed to load ' + src));
       document.head.appendChild(s);
     });
   }

   function loadConjugator() {
     return new Promise((resolve, reject) => {
       const script = document.createElement('script');
       script.type = 'module';
       script.textContent = `
         import { Conjugator } from 'https://esm.sh/@jirimracek/conjugate-esp@2.3.6';
         window.__conjugator = new Conjugator();
         window.dispatchEvent(new Event('conjugator-loaded'));
       `;
       script.onerror = reject;
       document.head.appendChild(script);
       window.addEventListener('conjugator-loaded', () => {
         resolve(window.__conjugator);
       }, { once: true });
     });
   }

   // Page builder first — grid works immediately
   loadScript(app_js_url)
     .then(() => loadConjugator())
     .then(() => loadScript(conjugations_js_url))
     .then(() => {
       const input = document.getElementById('verbInput');
       if (input) input.dispatchEvent(new Event('input'));
     })
     .catch(err => console.warn(err));
 })();
