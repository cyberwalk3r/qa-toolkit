#!/usr/bin/env node

/**
 * QA Toolkit — Session Stop Hook
 *
 * Runs on Stop to promote session findings to project state,
 * archive the completed session, and log activity. Replaces
 * the original save-artifact.js with expanded state-aware functionality.
 *
 * Each section (promote, archive, log) is independent -- a failure
 * in one does not prevent the others from running.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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
const stateManagerPath = path.join(pluginRoot, 'scripts', 'state-manager.js');
const logPath = path.join(configDir, '.qa-activity.log');

function execState(...args) {
    return execFileSync('node', [stateManagerPath, ...args], {
        cwd: projectRoot,
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot },
        encoding: 'utf8',
        timeout: 5000,
    });
}

// ---- 1. Promote session findings to project state ----

let sessionData = null;
let featureUnderTest = null;
let findingsCount = 0;

try {
    const raw = execState('read', 'session');
    sessionData = JSON.parse(raw);
    featureUnderTest = sessionData.featureUnderTest || null;
    const findings = sessionData.findings || [];
    findingsCount = findings.length;

    if (findings.length > 0) {
        for (const finding of findings) {
            if (finding.type === 'risk' || finding.severity) {
                try {
                    execState('merge', 'project', 'risks', JSON.stringify(finding));
                } catch (err) {
                    console.error(`Failed to merge risk: ${err.message}`);
                }
            } else if (finding.type === 'coverage-gap') {
                try {
                    execState('merge', 'project', 'coverageGaps', JSON.stringify(finding));
                } catch (err) {
                    console.error(`Failed to merge coverage gap: ${err.message}`);
                }
            }
        }
    }

    // Update historical findings
    try {
        const projectRaw = execState('read', 'project', 'historicalFindings');
        let hist = JSON.parse(projectRaw);
        if (!hist || typeof hist !== 'object') {
            hist = {
                totalSessions: 0,
                bugsReported: 0,
                testCasesGenerated: 0,
                areasReviewed: [],
            };
        }

        hist.totalSessions = (hist.totalSessions || 0) + 1;

        for (const finding of findings) {
            if (finding.type === 'bug') hist.bugsReported = (hist.bugsReported || 0) + 1;
            if (finding.type === 'test-case') hist.testCasesGenerated = (hist.testCasesGenerated || 0) + 1;
        }

        if (featureUnderTest) {
            if (!Array.isArray(hist.areasReviewed)) hist.areasReviewed = [];
            if (!hist.areasReviewed.includes(featureUnderTest)) {
                hist.areasReviewed.push(featureUnderTest);
            }
        }

        execState('write', 'project', 'historicalFindings', JSON.stringify(hist));
    } catch (err) {
        console.error(`Failed to update historical findings: ${err.message}`);
    }
} catch (err) {
    console.error(`Failed to promote session findings: ${err.message}`);
}

// ---- 2. Archive session ----

try {
    execState('archive', 'session');
} catch (err) {
    console.error(`Failed to archive session: ${err.message}`);
}

// ---- 3. Log activity (absorbs save-artifact.js functionality) ----

try {
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    // Scan for recently modified artifacts (last 5 minutes)
    const recentFiles = [];
    const cutoff = Date.now() - 5 * 60 * 1000;

    function walkDir(dir, cutoffMs, baseDir, results) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch { return; }
        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            if (entry.name === 'sessions') continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walkDir(fullPath, cutoffMs, baseDir, results);
            } else if (entry.isFile()) {
                try {
                    const stat = fs.statSync(fullPath);
                    if (stat.mtimeMs > cutoffMs) {
                        results.push(path.relative(baseDir, fullPath));
                    }
                } catch { /* skip unreadable files */ }
            }
        }
    }

    walkDir(configDir, cutoff, configDir, recentFiles);

    // Build log entry with session summary
    const parts = [];
    parts.push(`[${new Date().toISOString()}]`);
    if (featureUnderTest) {
        parts.push(`Feature: ${featureUnderTest}`);
    }
    if (findingsCount > 0) {
        parts.push(`Findings: ${findingsCount}`);
    }
    parts.push(`Artifacts: ${recentFiles.length > 0 ? recentFiles.join(', ') : '(none)'}`);

    const logLine = parts.join(' | ') + '\n';
    fs.appendFileSync(logPath, logLine);
} catch (err) {
    console.error(`Failed to log activity: ${err.message}`);
}

// ---- Summary output ----

const summaryParts = ['[QA Toolkit] Session ended.'];
if (findingsCount > 0) summaryParts.push(`Findings promoted: ${findingsCount}`);
if (typeof recentFiles !== 'undefined' && recentFiles.length > 0) summaryParts.push(`Artifacts modified: ${recentFiles.length}`);
console.log(summaryParts.join(' '));
