/**
 * Injeta <app-public-lgpd-footer> em todas as páginas públicas.
 * Idempotente: detecta se já foi aplicado e pula.
 */
const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'src', 'app', 'pages');
const PAGES = [
  'public-classificacao-riscos',
  'public-classificacao-riscos-consolidado',
  'public-classificacao-riscos-grupo',
  'public-departamento-view',
  'public-matriz-swot',
  'public-mentoria-hub',
  'public-mentoria-view',
  'public-okr-view',
  'public-planejamento-view',
  'public-recruitment-proposal-view',
  'public-swot-consolidado',
  'public-vagas-hub'
];

const IMPORT_LINE = "import { PublicLgpdFooterComponent } from '../../components/public-lgpd-footer/public-lgpd-footer';";
const SELECTOR = '<app-public-lgpd-footer></app-public-lgpd-footer>';

function findFile(dir, basename) {
  // procura .ts/.html com qualquer sufixo (component.ts, .ts, etc)
  const files = fs.readdirSync(dir);
  return files;
}

function patchTs(tsPath) {
  let src = fs.readFileSync(tsPath, 'utf8');
  if (src.includes('PublicLgpdFooterComponent')) {
    return { changed: false, reason: 'já tem' };
  }

  // Adicionar import — depois do último import existente
  const lines = src.split(/\r?\n/);
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i])) lastImportIdx = i;
  }
  if (lastImportIdx === -1) return { changed: false, reason: 'sem imports' };
  lines.splice(lastImportIdx + 1, 0, IMPORT_LINE);
  src = lines.join('\n');

  // Adicionar componente no array imports do @Component
  // Caso 1: imports: [ ... , X],   (linha única)
  const reSingle = /(imports:\s*\[)([^\]]*)(\])/m;
  const m = src.match(reSingle);
  if (!m) return { changed: false, reason: 'imports[] não encontrado' };

  const inside = m[2].trim().replace(/\s*,\s*$/, '');
  const newInside = inside.length === 0
    ? 'PublicLgpdFooterComponent'
    : inside + ', PublicLgpdFooterComponent';
  src = src.replace(reSingle, `${m[1]}${newInside}${m[3]}`);

  fs.writeFileSync(tsPath, src);
  return { changed: true };
}

function patchHtml(htmlPath) {
  let src = fs.readFileSync(htmlPath, 'utf8');
  if (src.includes('app-public-lgpd-footer')) {
    return { changed: false, reason: 'já tem' };
  }
  // Adiciona no final do arquivo (último componente do template)
  const newSrc = src.replace(/\s*$/, '\n\n' + SELECTOR + '\n');
  fs.writeFileSync(htmlPath, newSrc);
  return { changed: true };
}

function processPage(pageName) {
  const pageDir = path.join(PAGES_DIR, pageName);
  if (!fs.existsSync(pageDir)) {
    console.log(`  ⚠️ ${pageName}: diretório não existe`);
    return;
  }
  const files = fs.readdirSync(pageDir);
  const tsFile = files.find(f => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
  const htmlFile = files.find(f => f.endsWith('.html'));

  if (!tsFile || !htmlFile) {
    console.log(`  ⚠️ ${pageName}: ts/html não encontrado`);
    return;
  }

  const tsRes = patchTs(path.join(pageDir, tsFile));
  const htmlRes = patchHtml(path.join(pageDir, htmlFile));
  console.log(`  ${pageName}:`);
  console.log(`    TS  → ${tsRes.changed ? '✅ patched' : '⏭️  ' + (tsRes.reason || 'skip')}`);
  console.log(`    HTML→ ${htmlRes.changed ? '✅ patched' : '⏭️  ' + (htmlRes.reason || 'skip')}`);
}

console.log('Injetando rodapé LGPD nas páginas públicas...\n');
PAGES.forEach(processPage);
console.log('\nFeito.');
