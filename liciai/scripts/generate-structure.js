// scripts/generate-structure.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const FUNCTIONS_DIR = path.join(ROOT_DIR, "functions");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const SCRIPTS_DIR = path.join(ROOT_DIR, "scripts");
const OUTPUT_FILE = path.join(PUBLIC_DIR, "project-structure.json");

// Lista expandida de arquivos importantes para dar mais contexto à IA.
// Incluímos o próprio script para que a IA saiba como o contexto é gerado.
const KEY_FILES_TO_READ = new Set([
  'functions/src/index.ts',
  'functions/package.json',
  'public/errordash.html',
  'firebase.json',
  'package.json', // package.json da raiz
  'scripts/generate-structure.js' // O próprio script
]);

// Ignora diretórios comuns para manter o JSON limpo e focado.
const IGNORE_DIRS = new Set(['node_modules', '.git', '.firebase', '.vscode', 'lib', 'dist']);

function readTree(dirPath) {
  const items = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      // Normaliza os caminhos para usar barras '/' consistentes.
      const relativePath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');

      const item = {
        name: entry.name,
        path: relativePath,
        type: entry.isDirectory() ? 'folder' : 'file',
      };

      if (entry.isDirectory()) {
        item.children = readTree(fullPath);
      } else {
        // Se o arquivo está na nossa lista de arquivos-chave, lê seu conteúdo.
        if (KEY_FILES_TO_READ.has(relativePath)) {
          try {
            item.content = fs.readFileSync(fullPath, 'utf8');
          } catch (e) {
            item.content = `Erro ao ler o arquivo: ${e.message}`;
          }
        }
      }
      items.push(item);
    }
  } catch (e) {
    console.error(`Erro lendo o diretório ${dirPath}:`, e);
  }
  // Ordena para que pastas venham antes de arquivos, e depois em ordem alfabética.
  items.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));
  return items;
}

function main() {
  console.log("Iniciando geração da estrutura do projeto...");

  // Mapeia toda a estrutura a partir da raiz para capturar todos os arquivos-chave.
  const fullStructure = readTree(ROOT_DIR);
  
  const payload = {
    generatedAt: new Date().toISOString(),
    structure: {
        // Mantemos a estrutura backend/frontend para compatibilidade com a renderização.
        // Filtramos a estrutura completa para popular essas chaves.
        backend: fullStructure.find(item => item.name === 'functions')?.children || [],
        frontend: fullStructure.find(item => item.name === 'public')?.children || [],
        // Adicionamos uma estrutura raiz para arquivos como firebase.json e package.json
        root: fullStructure.filter(item => item.type === 'file')
    }
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`✔ Estrutura completa (com conteúdo) gerada em: ${OUTPUT_FILE}`);
}

main();
