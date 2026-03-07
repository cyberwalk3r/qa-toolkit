#!/usr/bin/env node

/**
 * QA Toolkit — Artifact Persistence Script
 * 
 * Runs on Stop to log completed QA task metadata
 * for activity tracking and metrics reporting.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

// Read plugin settings
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..');
let outputDir = 'qa-artifacts';
try {
    const settings = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'settings.json'), 'utf8'));
    if (settings.outputDir) {
        if (path.isAbsolute(settings.outputDir) || settings.outputDir.includes('..')) {
            console.error('Error: outputDir must be a relative path without ".." components');
            process.exit(1);
        }
        outputDir = settings.outputDir;
    }
    if (settings.hooksEnabled === false) process.exit(0);
} catch { /* use default */ }

const configDir = path.join(projectRoot, outputDir);
const logPath = path.join(configDir, '.qa-activity.log');

// Ensure directory exists
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

// Scan for recently modified artifacts (last 5 minutes)
const recentFiles = [];
const cutoff = Date.now() - 5 * 60 * 1000;

function walkDir(dir, cutoff, baseDir) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return; }
    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath, cutoff, baseDir);
        } else if (entry.isFile()) {
            try {
                const stat = fs.statSync(fullPath);
                if (stat.mtimeMs > cutoff) {
                    recentFiles.push(path.relative(baseDir, fullPath));
                }
            } catch { /* skip unreadable files */ }
        }
    }
}

walkDir(configDir, cutoff, configDir);

// Log task completion with details
const entry = {
    timestamp: new Date().toISOString(),
    artifacts: recentFiles.length > 0 ? recentFiles : ['(no new artifacts detected)']
};

const logLine = `[${entry.timestamp}] Task completed | Artifacts: ${entry.artifacts.join(', ')}\n`;
fs.appendFileSync(logPath, logLine);
