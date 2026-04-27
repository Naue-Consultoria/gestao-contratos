/**
 * Reposiciona <app-public-lgpd-footer> de fora do footer pra dentro,
 * logo após a linha de copyright. Idempotente.
 */
const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'src', 'app', 'pages');
const PAGES = [
  'public-arvores-view',
  'public-classificacao-riscos',
  'public-classificacao-riscos-consolidado',
  'public-classificacao-riscos-grupo',
  'public-departamento-view',
  'public-matriz-swot',
  'public-mentoria-hub',
  'public-mentoria-view',
  'public-okr-view',
  'public-planejamento-view',
  'public-proposal-view',
  'public-recruitment-proposal-view',
  'public-swot-consolidado',
  'public-vagas-hub'
];

const TAG = '<app-public-lgpd-footer></app-public-lgpd-footer>';

function fixHtml(htmlPath) {
  let src = fs.readFileSync(htmlPath, 'utf8');

  // 1. Remove qualquer ocorrência existente (vamos reinserir no lugar certo)
  const before = src;
  src = src.replace(/\n*\s*<app-public-lgpd-footer><\/app-public-lgpd-footer>\n*/g, '\n');

  // 2. Localiza a linha de copyright (qualquer variação de "Todos os direitos reservados")
  const lines = src.split(/\r?\n/);
  let copyIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/Todos os direitos reservados/i.test(lines[i])) {
      copyIdx = i;
      break;
    }
  }

  if (copyIdx === -1) {
    return { changed: false, reason: 'sem linha de copyright detectada' };
  }

  // 3. Pega indentação da linha do copyright pra manter alinhamento
  const indent = (lines[copyIdx].match(/^\s*/) || [''])[0];

  // 4. Insere o tag DEPOIS da linha do copyright
  lines.splice(copyIdx + 1, 0, indent + TAG);

  const newSrc = lines.join('\n');
  if (newSrc === before) {
    return { changed: false, reason: 'sem mudança' };
  }
  fs.writeFileSync(htmlPath, newSrc);
  return { changed: true };
}

console.log('Reposicionando rodapé LGPD para dentro do rodapé existente...\n');
PAGES.forEach(pageName => {
  const dir = path.join(PAGES_DIR, pageName);
  if (!fs.existsSync(dir)) {
    console.log(`  ⚠️ ${pageName}: dir não existe`);
    return;
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  files.forEach(f => {
    const res = fixHtml(path.join(dir, f));
    console.log(`  ${pageName}/${f}: ${res.changed ? '✅' : '⏭️  ' + res.reason}`);
  });
});
console.log('\nFeito.');
