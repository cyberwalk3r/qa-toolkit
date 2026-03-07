#!/usr/bin/env node

/**
 * QA Toolkit — State Manager
 *
 * CLI script for reading, writing, merging, initializing, and archiving
 * two-layer state: project-level (.qa-context.json) and session-level
 * (.qa-session.json). All output is JSON to stdout; errors go to stderr.
 *
 * Usage:
 *   node state-manager.js read <project|session> [key]
 *   node state-manager.js write <project|session> <key> <json-value>
 *   node state-manager.js merge <project|session> <field> <json-item>
 *   node state-manager.js init session
 *   node state-manager.js archive session
 */

const fs = require('fs');
const path = require('path');

// ---- Constants ----

const CURRENT_SCHEMA_VERSION = 1;

const SESSION_APPEND_FIELDS = ['findings', 'skillHistory'];

// ---- Settings ----

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
} catch { /* use default */ }

const projectRoot = process.cwd();

// ---- Default Schemas ----

function getDefaultState(target) {
    if (target === 'project') {
        return {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            detectedAt: null,
            projectRoot,
            outputDir,
            detection: {},
            risks: [],
            coverageGaps: [],
            testingConventions: [],
            historicalFindings: {
                totalSessions: 0,
                bugsReported: 0,
                testCasesGenerated: 0,
                areasReviewed: [],
            },
        };
    }
    if (target === 'session') {
        return {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            startedAt: new Date().toISOString(),
            featureUnderTest: null,
            sessionGoal: null,
            findings: [],
            skillHistory: [],
        };
    }
    console.error(`Unknown target: ${target}. Use "project" or "session".`);
    process.exit(1);
}

// ---- Core Utilities ----

function getStatePath(target) {
    const dir = path.join(projectRoot, outputDir);
    if (target === 'project') return path.join(dir, '.qa-context.json');
    if (target === 'session') return path.join(dir, '.qa-session.json');
    console.error(`Unknown target: ${target}. Use "project" or "session".`);
    process.exit(1);
}

function validateSchema(data) {
    if (!data.schemaVersion) {
        return { valid: false, reason: 'missing' };
    }
    if (data.schemaVersion > CURRENT_SCHEMA_VERSION) {
        return { valid: false, reason: 'newer' };
    }
    if (data.schemaVersion < CURRENT_SCHEMA_VERSION) {
        return { valid: false, reason: 'outdated', from: data.schemaVersion };
    }
    return { valid: true };
}

function writeStateFile(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, filePath);
}

function readStateFile(filePath, target) {
    if (!fs.existsSync(filePath)) {
        return getDefaultState(target);
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        const validation = validateSchema(data);
        if (!validation.valid) {
            console.error(`Schema validation failed: ${validation.reason}`);
            return getDefaultState(target);
        }
        return data;
    } catch (err) {
        console.error(`Failed to read state: ${err.message}`);
        return getDefaultState(target);
    }
}

function mergeByKey(existing, incoming, keyField) {
    const map = new Map(existing.map(item => [item[keyField], item]));
    const key = incoming[keyField];
    if (key !== undefined && map.has(key)) {
        const prev = map.get(key);
        map.set(key, {
            ...prev,
            ...incoming,
            count: (prev.count || 1) + 1,
            lastSeen: new Date().toISOString(),
        });
    } else {
        const itemKey = key || `_anon_${Date.now()}`;
        map.set(itemKey, {
            ...incoming,
            count: 1,
            lastSeen: new Date().toISOString(),
        });
    }
    return [...map.values()];
}

// ---- Key field mapping for merge deduplication ----

function getKeyField(fieldName) {
    const keyFields = {
        risks: 'area',
        coverageGaps: 'area',
        testingConventions: 'name',
        findings: 'area',
        skillHistory: 'skill',
    };
    return keyFields[fieldName] || 'id';
}

// ---- Subcommands ----

function read(args) {
    const [target, key] = args;
    if (!target) {
        console.error('Usage: state-manager.js read <project|session> [key]');
        process.exit(1);
    }
    const filePath = getStatePath(target);
    const data = readStateFile(filePath, target);
    if (key) {
        console.log(JSON.stringify(data[key] !== undefined ? data[key] : null));
    } else {
        console.log(JSON.stringify(data));
    }
}

function write(args) {
    const [target, key, ...valueParts] = args;
    if (!target || !key || valueParts.length === 0) {
        console.error('Usage: state-manager.js write <project|session> <key> <json-value>');
        process.exit(1);
    }
    const valueStr = valueParts.join(' ');
    let value;
    try {
        value = JSON.parse(valueStr);
    } catch (err) {
        console.error(`Failed to parse value as JSON: ${err.message}`);
        process.exit(1);
    }

    const filePath = getStatePath(target);
    const data = readStateFile(filePath, target);

    if (SESSION_APPEND_FIELDS.includes(key) && target === 'session') {
        if (!Array.isArray(data[key])) {
            data[key] = [];
        }
        data[key].push(value);
    } else {
        data[key] = value;
    }

    writeStateFile(filePath, data);
    console.log(JSON.stringify(data));
}

function merge(args) {
    const [target, field, ...itemParts] = args;
    if (!target || !field || itemParts.length === 0) {
        console.error('Usage: state-manager.js merge <project|session> <field> <json-item>');
        process.exit(1);
    }
    const itemStr = itemParts.join(' ');
    let item;
    try {
        item = JSON.parse(itemStr);
    } catch (err) {
        console.error(`Failed to parse item as JSON: ${err.message}`);
        process.exit(1);
    }

    const filePath = getStatePath(target);
    const data = readStateFile(filePath, target);

    if (!Array.isArray(data[field])) {
        data[field] = [];
    }

    const keyField = getKeyField(field);
    data[field] = mergeByKey(data[field], item, keyField);

    writeStateFile(filePath, data);
    console.log(JSON.stringify(data));
}

function init(args) {
    const [target] = args;
    if (target !== 'session') {
        console.error('init is only supported for session target');
        process.exit(1);
    }

    const filePath = getStatePath(target);

    // Archive existing session if it has content
    if (fs.existsSync(filePath)) {
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const existing = JSON.parse(raw);
            const hasContent = existing.featureUnderTest ||
                existing.sessionGoal ||
                (existing.findings && existing.findings.length > 0) ||
                (existing.skillHistory && existing.skillHistory.length > 0);
            if (hasContent) {
                archiveSession(filePath);
            }
        } catch { /* skip archive on parse error */ }
    }

    const freshState = getDefaultState('session');
    writeStateFile(filePath, freshState);
    console.log(JSON.stringify(freshState));
}

function archive(args) {
    const [target] = args;
    if (target !== 'session') {
        console.error('archive is only supported for session target');
        process.exit(1);
    }

    const filePath = getStatePath(target);
    const archivePath = archiveSession(filePath);
    console.log(JSON.stringify(archivePath));
}

function archiveSession(filePath) {
    const sessionsDir = path.join(projectRoot, outputDir, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const archivePath = path.join(sessionsDir, `${timestamp}.json`);

    if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, archivePath);
    } else {
        const defaultSession = getDefaultState('session');
        fs.writeFileSync(archivePath, JSON.stringify(defaultSession, null, 2));
    }

    return archivePath;
}

// ---- CLI Dispatch ----

const commands = { read, write, merge, init, archive };
const cmd = process.argv[2];

if (!cmd || !commands[cmd]) {
    console.error(`Unknown command: ${cmd || '(none)'}. Available: ${Object.keys(commands).join(', ')}`);
    process.exit(1);
}

try {
    commands[cmd](process.argv.slice(3));
} catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
}
