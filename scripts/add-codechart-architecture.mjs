#!/usr/bin/env node
/**
 * Adds @Architecture(descriptionShort=...) to Trama source modules.
 * Reads descriptions from mds/live/file-map.md when available.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILE_MAP = path.join(ROOT, 'mds/live/file-map.md');
const EXT = new Set(['.ts', '.tsx', '.mts', '.cts']);
const IGNORE = [
  /^\.git\//,
  /^node_modules\//,
  /^dist\//,
  /^dist-electron\//,
  /^build\//,
  /^coverage\//,
  /^tests\//,
  /^\.codechart-ref\//,
  /\.group\.md$/,
];

function posix(p) {
  return p.split(path.sep).join('/');
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = posix(path.join(dir, ent.name).slice(ROOT.length + 1));
    if (ent.isDirectory()) {
      if (['node_modules', 'dist', 'dist-electron', 'build', 'coverage', '.git', '.codechart-ref', 'tests'].includes(ent.name)) continue;
      walk(path.join(dir, ent.name), out);
    } else if (EXT.has(path.extname(ent.name)) && !IGNORE.some((re) => re.test(rel))) {
      out.push(rel);
    }
  }
  return out;
}

function parseFileMap(content) {
  const map = new Map();
  const lines = content.split('\n');
  let current = null;
  for (const line of lines) {
    const fileMatch = line.match(/^- `([^`]+)`\s*$/);
    if (fileMatch) {
      current = fileMatch[1].replace(/\\/g, '/');
      continue;
    }
    if (current && line.match(/^\s+- /)) {
      const desc = line.replace(/^\s+- /, '').trim();
      if (!map.has(current)) map.set(current, desc);
    }
  }
  return map;
}

function toShortDescription(raw) {
  let s = raw
    .replace(/^Deep module[^:]*:\s*/i, '')
    .replace(/^Public facade[^.]*\.\s*/i, '')
    .replace(/^Thin wrapper[^:]*:\s*/i, '')
    .replace(/^Extracted[^:]*:\s*/i, '')
    .replace(/^Unit tests for `[^`]+`:\s*/i, '')
    .replace(/^Renderer hook for /i, 'Hook for ')
    .replace(/^IPC handler for /i, 'Handles ')
    .replace(/^IPC handlers for /i, 'Handles ')
    .replace(/\. Architecture:.+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Prefer first clause before em dash or period
  const cut = s.split(/\s+[—–-]\s+|\.\s+/)[0];
  s = cut || s;

  // Drop trailing period per CodeChart style
  s = s.replace(/\.$/, '');

  // Trim to ~90 chars on word boundary
  if (s.length > 90) {
    s = s.slice(0, 87).replace(/\s+\S*$/, '');
  }

  // Ensure verb-first-ish minimum length
  if (s.split(/\s+/).length < 3) {
    s = raw.split(/[.;]/)[0].replace(/\.$/, '').slice(0, 90);
  }

  return s;
}

function heuristicDescription(rel) {
  const base = path.basename(rel, path.extname(rel));
  const dir = path.dirname(rel);

  if (base === 'index') return 'Public facade re-exporting module surface';
  if (rel.endsWith('.d.ts')) return 'Ambient TypeScript declarations for preload API';
  if (base.startsWith('use-')) {
    const topic = base.slice(4).replace(/-/g, ' ');
    return `Hook orchestrating ${topic} state and effects`;
  }
  if (base.endsWith('-handler') || base.endsWith('-handlers')) {
    const topic = base.replace(/-handlers?$/, '').replace(/-/g, ' ');
    return `Handles ${topic} IPC requests with envelope responses`;
  }
  if (base.endsWith('-service')) {
    const topic = base.replace(/-service$/, '').replace(/-/g, ' ');
    return `Orchestrates ${topic} backend operations on disk`;
  }
  if (base.endsWith('-logic') || base.endsWith('-helpers') || base.endsWith('-helper')) {
    return 'Pure helper functions for adjacent UI or domain logic';
  }
  if (base.endsWith('-types') || base.endsWith('-type')) return 'Shared TypeScript types for adjacent module';
  if (dir.includes('private') || dir.includes('Private')) return 'Private implementation detail for parent module';
  if (base.endsWith('-dialog') || base.endsWith('-modal')) return 'Modal dialog UI for editor workflow step';
  if (base.endsWith('-panel') || base.endsWith('-view') || base.endsWith('-body')) {
    return 'Presentational UI component for editor shell area';
  }
  if (rel.includes('/components/sidebar/')) return 'Sidebar UI component for project explorer workflow';
  if (rel.includes('/electron/services/')) return 'Main-process service for filesystem or export pipeline';
  if (rel.includes('/electron/ipc/')) return 'IPC wiring or handler for renderer-main bridge';
  if (rel.includes('/shared/')) return 'Shared contract or utility used across processes';
  if (rel.includes('rich-markdown-editor')) return 'Rich markdown editor behavior or Quill integration helper';
  if (rel.includes('relationships-editor')) return 'Relationships chart editor behavior or rendering helper';
  if (rel.includes('editor-session')) return 'Editor session lifecycle or Quill feature hook helper';

  const words = base.replace(/[-_]/g, ' ');
  return `Implements ${words} for the writing workspace`;
}

function escapeAttr(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function architectureLine(desc, useBlock) {
  const inner = `descriptionShort="${escapeAttr(desc)}"`;
  if (useBlock) return `/** @Architecture(${inner}) */`;
  return `// @Architecture(${inner})`;
}

function hasArchitecture(content) {
  return /@Architecture\s*\(/.test(content);
}

function annotateFile(rel, descMap) {
  const abs = path.join(ROOT, rel);
  let content = fs.readFileSync(abs, 'utf8');
  if (hasArchitecture(content)) return { rel, status: 'skipped' };

  const raw = descMap.get(rel) ?? heuristicDescription(rel);
  const desc = toShortDescription(raw);
  const useBlock = content.startsWith('/**');
  const line = architectureLine(desc, useBlock);
  content = `${line}\n${content}`;
  fs.writeFileSync(abs, content, 'utf8');
  return { rel, status: 'added', desc };
}

const descMap = parseFileMap(fs.readFileSync(FILE_MAP, 'utf8'));
const roots = ['src', 'electron'].map((d) => path.join(ROOT, d)).filter((d) => fs.existsSync(d));
const files = roots.flatMap((d) => walk(d)).sort();

const results = files.map((rel) => annotateFile(rel, descMap));
const added = results.filter((r) => r.status === 'added');
const skipped = results.filter((r) => r.status === 'skipped');

console.log(`Annotated ${added.length} files (${skipped.length} already had metadata)`);
if (added.length <= 30) {
  for (const r of added) console.log(`  + ${r.rel}: ${r.desc}`);
}
