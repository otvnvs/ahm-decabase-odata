#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const srcDir = './src'; 
const outputFile = './src/style.css';

// Initialize clean output file
fs.writeFileSync(outputFile, '/* Extracted Vue Styles */\n\n');

function walkDirectory(currentPath) {
    const files = fs.readdirSync(currentPath);

    files.forEach(file => {
        const fullPath = path.join(currentPath, file);
        const stat = fs.statSync(fullPath);

        if (fullPath === path.normalize(outputFile)) return;

        if (stat.isDirectory()) {
            walkDirectory(fullPath);
        } else if (file.endsWith('.vue')) {
            extractAndModifyFile(fullPath);
        }
    });
}

function extractAndModifyFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Matches the entire <style>...</style> block including attributes
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;
    let match;
    let fileStyles = '';

    // Loop through and collect content from all style tags in the file
    while ((match = styleRegex.exec(content)) !== null) {
        // match[1] contains only the content inside the tags
        const insideContent = match[1].trim(); 
        if (insideContent) {
            fileStyles += insideContent + '\n\n';
        }
    }

    // If styles were found, append them to style.css and strip them from the .vue file
    if (fileStyles.trim()) {
        const comment = `/* Source: ${filePath} */\n`;
        fs.appendFileSync(outputFile, comment + fileStyles);

        // Remove the style blocks entirely from the file content
        const cleanedContent = content.replace(styleRegex, '').trim() + '\n';
        
        // Write the modified content back to the original file
        fs.writeFileSync(filePath, cleanedContent, 'utf8');
        console.log(`Stripped styles from: ${filePath}`);
    }
}

console.log(`Scanning folder: ${srcDir}...`);
if (fs.existsSync(srcDir)) {
    walkDirectory(srcDir);
    console.log(`Success! All styles removed and saved to ${outputFile}`);
} else {
    console.error(`Error: Directory ${srcDir} does not exist.`);
}

