const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const styleRegex = /<style>[\s\S]*?<\/style>/;
if (!styleRegex.test(html)) {
  throw new Error('No <style> block found in index.html');
}

html = html.replace(styleRegex, '  <link rel="stylesheet" href="/assets/css/dashboard.css">');

const scriptRegex = /<script>[\s\S]*?<\/script>\s*<\/body>/;
if (!scriptRegex.test(html)) {
  throw new Error('No inline <script> block found in index.html');
}

html = html.replace(
  scriptRegex,
  '  <script type="module" src="/assets/js/dashboard/main.js"></script>\n</body>'
);

fs.writeFileSync(indexPath, html);
