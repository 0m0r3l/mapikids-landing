const fs = require('fs');
const path = require('path');

// Fonction utilitaire pour lire un fichier
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.warn(`⚠️ Impossible de lire ${filePath}:`, error.message);
        return '';
    }
}

// Fonction utilitaire pour écrire un fichier
function writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
}

// Fonction utilitaire pour vider un dossier
function emptyDir(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
    fs.mkdirSync(dirPath, { recursive: true });
}

// Chemins
const SRC_DIR = './src';
const DIST_DIR = './dist';
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');
const TEMPLATES_DIR = path.join(SRC_DIR, 'templates');
const CONFIG_DIR = path.join(SRC_DIR, 'config');

function loadComponent(name) {
    const filePath = path.join(COMPONENTS_DIR, name);
    return readFile(filePath);
}

function loadGlobalStyles() {
    const indexContent = readFile('./index.html');
    const styleMatch = indexContent.match(/<style>([\s\S]*?)<\/style>/);
    return styleMatch ? styleMatch[1] : '';
}

function buildPage(pageKey, pageConfig) {
    try {
        console.log(`🏗️  Building ${pageKey}...`);
        
        // Charger le template
        const templatePath = path.join(TEMPLATES_DIR, pageConfig.template);
        let template = readFile(templatePath);
        
        if (!template) {
            throw new Error(`Template ${pageConfig.template} introuvable`);
        }
        
        // Charger les composants
        const headSeo = loadComponent('head-seo.html');
        const nav = loadComponent('nav.html');
        const decorations = loadComponent('decorations.html');
        const footer = loadComponent('footer.html');
        const modalMentions = loadComponent('modal-mentions.html');
        
        // Charger les styles globaux
        const globalStyles = loadGlobalStyles();
        
        // Scripts externes selon le type de page
        let externalScripts = '';
        if (pageKey === 'stats.html') {
            externalScripts = `
                <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
            `;
        }
        
        // Contenu de la page
        let pageContent = `<div class="main-container"><p>Contenu de ${pageKey} sera ajouté ici</p></div>`;
        
        if (pageKey === 'stats.html') {
            pageContent = `
                <div class="main-container">
                    <div class="page-header">
                        <h1>Statistiques en temps réel</h1>
                        <p>Découvrez l'activité de la communauté Mapikids</p>
                    </div>
                </div>
                <div id="root"></div>
            `;
            
            // Extraire le script React de stats.html
            const statsContent = readFile('./stats.html');
            const scriptMatch = statsContent.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
            if (scriptMatch) {
                pageContent += `<script type="text/babel">${scriptMatch[1]}</script>`;
            }
        }
        
        // Liens footer spécifiques
        let footerExtraLinks = '';
        if (pageKey === 'stats.html') {
            footerExtraLinks = `
                <span style="margin: 0 0.5rem;">|</span>
                <a href="/">← Retour à l'accueil</a>
            `;
        }
        
        // Remplacer les placeholders
        const replacements = {
            '{{HEAD_SEO}}': headSeo
                .replace(/{{PAGE_TITLE}}/g, pageConfig.title)
                .replace(/{{PAGE_DESCRIPTION}}/g, pageConfig.description)
                .replace(/{{PAGE_OG_IMAGE}}/g, pageConfig.ogImage)
                .replace(/{{PAGE_URL}}/g, pageKey),
            '{{NAV_COMPONENT}}': nav,
            '{{DECORATIONS_COMPONENT}}': decorations,
            '{{PAGE_CONTENT}}': pageContent,
            '{{FOOTER_COMPONENT}}': footer.replace('{{FOOTER_EXTRA_LINKS}}', footerExtraLinks),
            '{{MODAL_MENTIONS}}': modalMentions,
            '{{EXTERNAL_SCRIPTS}}': externalScripts,
            '{{GLOBAL_STYLES}}': globalStyles,
            '{{PAGE_SCRIPTS}}': ''
        };
        
        // Appliquer les remplacements
        Object.entries(replacements).forEach(([placeholder, content]) => {
            template = template.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), content || '');
        });
        
        // Écrire le fichier final
        const outputPath = path.join(DIST_DIR, pageKey);
        writeFile(outputPath, template);
        console.log(`✅ ${pageKey} généré avec succès`);
        
    } catch (error) {
        console.error(`❌ Erreur lors de la génération de ${pageKey}:`, error.message);
    }
}

function copyAssets() {
    try {
        console.log('📁 Copie des assets...');
        
        const assetFiles = [
            'mapikids-logo-txt.png',
            'favicon.ico',
            'favicon-32x32.png',
            'favicon-16x16.png',
            'apple-touch-icon.png'
        ];
        
        for (const file of assetFiles) {
            if (fs.existsSync(file)) {
                const source = fs.readFileSync(file);
                fs.writeFileSync(path.join(DIST_DIR, file), source);
            }
        }
        
        console.log('✅ Assets copiés');
    } catch (error) {
        console.error('❌ Erreur copie assets:', error.message);
    }
}

function build() {
    try {
        console.log('🚀 Début du build...');
        
        // Nettoyer le dossier de destination
        emptyDir(DIST_DIR);
        
        // Charger la configuration des pages
        const pagesConfigPath = path.join(CONFIG_DIR, 'pages.json');
        const pagesConfig = JSON.parse(readFile(pagesConfigPath));
        
        if (!pagesConfig) {
            throw new Error('Configuration des pages introuvable');
        }
        
        // Construire chaque page
        for (const [pageKey, pageConfig] of Object.entries(pagesConfig)) {
            buildPage(pageKey, pageConfig);
        }
        
        // Copier les assets
        copyAssets();
        
        console.log('🎉 Build terminé avec succès!');
        console.log(`📦 Pages générées dans ${DIST_DIR}/`);
        
        // Lister les fichiers générés
        const files = fs.readdirSync(DIST_DIR);
        console.log('📋 Fichiers générés:');
        files.forEach(file => console.log(`  - ${file}`));
        
    } catch (error) {
        console.error('❌ Erreur de build:', error.message);
        process.exit(1);
    }
}

// Lancer le build
build();