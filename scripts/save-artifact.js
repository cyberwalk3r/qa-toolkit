#!/usr/bin/env node

/**
 * QA Toolkit — Artifact Persistence Script
 * 
 * Runs on TaskCompleted to log completed QA task metadata
 * for activity tracking and metrics reporting.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const configDir = path.join(projectRoot, 'qa-artifacts');
const logPath = path.join(configDir, '.qa-activity.log');

// Ensure directory exists
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

// Scan for recently modified artifacts (last 5 minutes)
const recentFiles = [];
const cutoff = Date.now() - 5 * 60 * 1000;
const artifactDirs = [
    'pr-reviews', 'bug-reports', 'test-cases', 'api-tests',
    'regression-plans', 'test-data', 'a11y-audits',
    'release-assessments', 'e2e-tests'
];

for (const dir of artifactDirs) {
    const dirPath = path.join(configDir, dir);
    if (!fs.existsSync(dirPath)) continue;
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs > cutoff) {
                recentFiles.push(`${dir}/${file}`);
            }
        }
    } catch { /* skip unreadable dirs */ }
}

// Log task completion with details
const entry = {
    timestamp: new Date().toISOString(),
    artifacts: recentFiles.length > 0 ? recentFiles : ['(no new artifacts detected)']
};

const logLine = `[${entry.timestamp}] Task completed | Artifacts: ${entry.artifacts.join(', ')}\n`;
fs.appendFileSync(logPath, logLine);
