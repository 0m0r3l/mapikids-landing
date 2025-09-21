const fs = require('fs-extra');
const path = require('path');

// Chemins
const SRC_DIR = './src';
const DIST_DIR = './dist';
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');
const TEMPLATES_DIR = path.join(SRC_DIR, 'templates');
const CONFIG_DIR = path.join(SRC_DIR, 'config');

// Cache pour les composants
const componentCache = {};

async function loadComponent(name) {
    if (!componentCache[name]) {
        const filePath = path.join(COMPONENTS_DIR, name);
        componentCache[name] = await fs.readFile(filePath, 'utf8');
    }
    return componentCache[name];
}

async function loadGlobalStyles() {
    const indexPath = './index.html';
    const indexContent = await fs.readFile(indexPath, 'utf8');
    
    // Extraire les styles entre <style> et </style>
    const styleMatch = indexContent.match(/<style>([\s\S]*?)<\/style>/);
    return styleMatch ? styleMatch[1] : '';
}

async function buildPage(pageKey, pageConfig) {
    try {
        console.log(`🏗️  Building ${pageKey}...`);
        
        // Charger le template
        const templatePath = path.join(TEMPLATES_DIR, pageConfig.template);
        let template = await fs.readFile(templatePath, 'utf8');
        
        // Charger les composants
        const headSeo = await loadComponent('head-seo.html');
        const nav = await loadComponent('nav.html');
        const decorations = await loadComponent('decorations.html');
        const footer = await loadComponent('footer.html');
        const modalMentions = await loadComponent('modal-mentions.html');
        
        // Charger les styles globaux
        const globalStyles = await loadGlobalStyles();
        
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
        
        // Contenu de la page (pour l'instant, utiliser le contenu existant)
        let pageContent = '';
        if (pageKey === 'index.html') {
            // Extraire le contenu de la page d'accueil actuelle
            const indexContent = await fs.readFile('./index.html', 'utf8');
            const bodyMatch = indexContent.match(/<body>([\s\S]*?)<\/body>/);
            if (bodyMatch) {
                pageContent = bodyMatch[1]
                    .replace(/<nav>[\s\S]*?<\/nav>/, '') // Supprimer nav existant
                    .replace(/<!-- Decorative Elements -->[\s\S]*?<div class="decoration-2"><\/div>/, '') // Supprimer decorations
                    .replace(/<footer>[\s\S]*?<\/footer>/, '') // Supprimer footer existant
                    .replace(/<!-- Modal Mentions Légales -->[\s\S]*?<\/div>\s*<\/div>/, '') // Supprimer modal existante
                    .replace(/<script>[\s\S]*?<\/script>/, '{{PAGE_SCRIPTS}}'); // Garder les scripts pour plus tard
            }
        } else if (pageKey === 'stats.html') {
            // Pour stats.html, utiliser le contenu React existant
            const statsContent = await fs.readFile('./stats.html', 'utf8');
            const reactMatch = statsContent.match(/<div id="root"><\/div>([\s\S]*?)<\/body>/);
            pageContent = `
                <div class="main-container">
                    <div class="page-header">
                        <h1>Statistiques en temps réel</h1>
                        <p>Découvrez l'activité de la communauté Mapikids</p>
                    </div>
                </div>
                <div id="root"></div>
                ${reactMatch ? reactMatch[1].replace(/<\/body>/, '') : ''}
            `;
        }
        
        // Liens footer spécifiques
        let footerExtraLinks = '';
        if (pageKey === 'stats.html') {
            footerExtraLinks = `
                <span style="margin: 0 0.5rem;">|</span>
                <a href="/">← Retour à l'accueil</a>
            `;
        }
        
        // Scripts JavaScript de la page
        let pageScripts = '';
        if (pageKey === 'stats.html') {
            const statsContent = await fs.readFile('./stats.html', 'utf8');
            const scriptMatch = statsContent.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
            if (scriptMatch) {
                pageScripts = `<script type="text/babel">${scriptMatch[1]}</script>`;
            }
        } else if (pageKey === 'index.html') {
            const indexContent = await fs.readFile('./index.html', 'utf8');
            const scriptMatch = indexContent.match(/<script>([\s\S]*?)<\/script>/);
            if (scriptMatch) {
                pageScripts = `<script>${scriptMatch[1]}</script>`;
            }
        }
        
        // Remplacer les placeholders
        const replacements = {
            '{{HEAD_SEO}}': headSeo
                .replace('{{PAGE_TITLE}}', pageConfig.title)
                .replace('{{PAGE_DESCRIPTION}}', pageConfig.description)
                .replace('{{PAGE_OG_IMAGE}}', pageConfig.ogImage)
                .replace('{{PAGE_URL}}', pageKey),
            '{{NAV_COMPONENT}}': nav,
            '{{DECORATIONS_COMPONENT}}': decorations,
            '{{PAGE_CONTENT}}': pageContent,
            '{{FOOTER_COMPONENT}}': footer.replace('{{FOOTER_EXTRA_LINKS}}', footerExtraLinks),
            '{{MODAL_MENTIONS}}': modalMentions,
            '{{EXTERNAL_SCRIPTS}}': externalScripts,
            '{{GLOBAL_STYLES}}': globalStyles,
            '{{PAGE_SCRIPTS}}': pageScripts
        };
        
        // Appliquer les remplacements
        Object.entries(replacements).forEach(([placeholder, content]) => {
            template = template.replace(new RegExp(placeholder, 'g'), content || '');
        });
        
        // Créer le dossier de destination si nécessaire
        const outputPath = path.join(DIST_DIR, pageKey);
        const outputDir = path.dirname(outputPath);
        await fs.ensureDir(outputDir);
        
        // Écrire le fichier final
        await fs.writeFile(outputPath, template);
        console.log(`✅ ${pageKey} généré avec succès`);
        
    } catch (error) {
        console.error(`❌ Erreur lors de la génération de ${pageKey}:`, error.message);
    }
}

async function copyAssets() {
    try {
        console.log('📁 Copie des assets...');
        
        // Copier tous les fichiers d'assets (images, favicon, etc.)
        const assetFiles = [
            'mapikids-logo-txt.png',
            'favicon.ico',
            'favicon-32x32.png',
            'favicon-16x16.png',
            'apple-touch-icon.png'
        ];
        
        for (const file of assetFiles) {
            if (await fs.pathExists(file)) {
                await fs.copy(file, path.join(DIST_DIR, file));
            }
        }
        
        console.log('✅ Assets copiés');
    } catch (error) {
        console.error('❌ Erreur copie assets:', error.message);
    }
}

async function build() {
    try {
        console.log('🚀 Début du build...');
        
        // Nettoyer le dossier de destination
        await fs.emptyDir(DIST_DIR);
        
        // Charger la configuration des pages
        const pagesConfig = await fs.readJson(path.join(CONFIG_DIR, 'pages.json'));
        
        // Construire chaque page
        for (const [pageKey, pageConfig] of Object.entries(pagesConfig)) {
            await buildPage(pageKey, pageConfig);
        }
        
        // Copier les assets
        await copyAssets();
        
        console.log('🎉 Build terminé avec succès!');
        console.log(`📦 Pages générées dans ${DIST_DIR}/`);
        
    } catch (error) {
        console.error('❌ Erreur de build:', error);
        process.exit(1);
    }
}

// Mode watch pour le développement
if (process.argv.includes('--watch')) {
    const chokidar = require('chokidar');
    
    console.log('👁️  Mode watch activé...');
    
    // Build initial
    build();
    
    // Surveiller les changements
    chokidar.watch([SRC_DIR, './index.html', './stats.html'], {
        ignored: /node_modules/,
        persistent: true
    }).on('change', (filePath) => {
        console.log(`📝 Changement détecté: ${filePath}`);
        build();
    });
} else {
    // Build unique
    build();
}

module.exports = { build };