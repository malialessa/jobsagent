// scripts/generate-context.js
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'CONTEXTO_PROJETO.md');

// Arquivos e pastas que o script vai ler (adaptado para a estrutura atual)
const DIRS_E_ARQUIVOS_PARA_INCLUIR = [
    'public/app.html',
    'functions/src/index.ts',
    'firebase.json',
    '.firebaserc',
];

// Pastas e arquivos a serem ignorados
const IGNORE_LIST = [
    'node_modules',
    '.git',
    'CONTEXTO_PROJETO.md',
    '.firebase',
    'firebase-debug.log',
    'package-lock.json',
    'yarn.lock'
];

function getFileTree(startPath, indent = '') {
    let tree = '';
    try {
        const files = fs.readdirSync(startPath);

        for (const file of files) {
            if (IGNORE_LIST.includes(file)) continue;

            const fullPath = path.join(startPath, file);
            const stats = fs.statSync(fullPath);

            tree += `${indent}├── ${file}\n`;

            if (stats.isDirectory()) {
                tree += getFileTree(fullPath, `${indent}│   `);
            }
        }
    } catch (e) {
        // Ignora erros de leitura de diretório, pode acontecer com arquivos de sistema
    }
    return tree;
}

function readFileContent(filePath) {
    try {
        const relativePath = path.relative(PROJECT_ROOT, filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const extension = path.extname(filePath).substring(1) || 'txt';
        
        return `
---
### 📄 Arquivo: \`${relativePath}\`
---

\`\`\`${extension}
${content}
\`\`\`
`;
    } catch (error) {
        console.warn(`Aviso: Não foi possível ler o arquivo ${filePath}. Ignorando.`);
        return '';
    }
}

async function main() {
    console.log("🚀 Gerando contexto do projeto LiciAI...");

    let finalContent = `# 🤖 Contexto do Projeto LiciAI\n\n`;
    finalContent += `*Gerado em: ${new Date().toISOString()}*\n\n`;
    
    finalContent += "## 📂 Estrutura de Arquivos\n\n";
    finalContent += "```\n";
    finalContent += getFileTree(PROJECT_ROOT);
    finalContent += "```\n\n";
    
    finalContent += "## 📜 Conteúdo dos Arquivos\n\n";

    for (const itemPath of DIRS_E_ARQUIVOS_PARA_INCLUIR) {
        const fullPath = path.join(PROJECT_ROOT, itemPath);
        if (!fs.existsSync(fullPath)) {
            console.warn(`Aviso: O caminho '${itemPath}' não foi encontrado. Ignorando.`);
            continue;
        }

        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            // Se precisar ler diretórios inteiros no futuro
        } else {
            finalContent += readFileContent(fullPath);
        }
    }

    fs.writeFileSync(OUTPUT_FILE, finalContent);
    console.log(`✅ Contexto do projeto salvo com sucesso em: ${OUTPUT_FILE}`);
}

main();