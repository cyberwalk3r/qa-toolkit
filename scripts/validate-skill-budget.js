#!/usr/bin/env node

/**
 * QA Toolkit — Skill Budget Validator
 *
 * Validates that the total character count of all skill registrations
 * (YAML frontmatter name + description) stays within the 16K budget.
 *
 * Usage:
 *   node scripts/validate-skill-budget.js          # formatted report
 *   node scripts/validate-skill-budget.js --json    # JSON output for CI
 */

const fs = require('fs');
const path = require('path');

const BUDGET_LIMIT = 16000;
const SKILLS_DIR = path.join(__dirname, '..', 'skills');

function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return match[1];
}

function parseField(frontmatter, field) {
  const re = new RegExp(`^${field}:\\s*(.+)$`, 'm');
  const match = frontmatter.match(re);
  if (!match) return '';
  return match[1].trim();
}

function discoverSkills() {
  const results = [];
  let entries;

  try {
    entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  } catch (err) {
    console.error(`Error reading skills directory: ${err.message}`);
    process.exit(1);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'shared') continue;

    const skillMdPath = path.join(SKILLS_DIR, entry.name, 'SKILL.md');

    if (!fs.existsSync(skillMdPath)) {
      console.warn(`Warning: ${entry.name}/ has no SKILL.md -- skipping`);
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(skillMdPath, 'utf8');
    } catch (err) {
      console.warn(`Warning: could not read ${skillMdPath} -- ${err.message}`);
      continue;
    }

    const frontmatter = extractFrontmatter(content);
    if (!frontmatter) {
      console.warn(`Warning: ${entry.name}/SKILL.md has no YAML frontmatter -- skipping`);
      continue;
    }

    const name = parseField(frontmatter, 'name');
    const description = parseField(frontmatter, 'description');

    if (!name) {
      console.warn(`Warning: ${entry.name}/SKILL.md has empty name field`);
    }
    if (!description) {
      console.warn(`Warning: ${entry.name}/SKILL.md has empty description field`);
    }

    const chars = name.length + description.length;
    results.push({ skill: entry.name, name, description, chars });
  }

  return results;
}

function main() {
  const jsonMode = process.argv.includes('--json');
  const skills = discoverSkills();

  skills.sort((a, b) => b.chars - a.chars);

  const total = skills.reduce((sum, s) => sum + s.chars, 0);
  const remaining = BUDGET_LIMIT - total;
  const pct = ((total / BUDGET_LIMIT) * 100).toFixed(1);
  const pass = total <= BUDGET_LIMIT;

  if (jsonMode) {
    const output = {
      skills: skills.map(s => ({ skill: s.skill, name: s.name, description: s.description, chars: s.chars })),
      total,
      budget: BUDGET_LIMIT,
      remaining,
      pass
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log('Skill Budget Report');
    console.log('='.repeat(60));
    console.log('');

    for (const s of skills) {
      console.log(`  ${String(s.chars).padStart(4)} chars  ${s.skill}`);
    }

    console.log('');
    console.log('-'.repeat(60));
    console.log(`  Total: ${total} / ${BUDGET_LIMIT} chars (${remaining} remaining)`);
    console.log(`  Percentage used: ${pct}%`);
    console.log(`  Status: ${pass ? 'PASS' : 'FAIL'}`);
  }

  process.exit(pass ? 0 : 1);
}

main();
