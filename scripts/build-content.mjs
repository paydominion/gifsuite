#!/usr/bin/env node
// Turns content/blog/*.md into lib/blog/posts.generated.json, which the site imports.
// (Cloudflare Workers have no file system at runtime, so posts are compiled ahead of time.)
//
//   node scripts/build-content.mjs            published posts only (builds, tests, deploys)
//   node scripts/build-content.mjs --drafts   also include `status: draft` posts (npm run dev)
//
// A post that breaks a rule below fails the build with a message saying what to fix.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content", "blog");
const OUT_FILE = path.join(ROOT, "lib", "blog", "posts.generated.json");

export const TYPES = ["tip", "history"];
export const TOOL_SLUGS = ["grab", "convert", "compress", "speed", "trim", "photo", "screenshots", "crop", "captions"];
export const LIMITS = { titleMax: 65, descriptionMin: 110, descriptionMax: 165, historyMinSources: 3, tipMinWords: 120, historyMinWords: 500 };

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (s) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SAFE_HREF = /^(https?:\/\/|\/(?!\/)|#|mailto:)/i;

/**
 * Splits a post into its frontmatter and body. The frontmatter is a small subset of YAML:
 * `key: value`, `key: [a, b]`, and a block list of plain lines under `key:`.
 */
export function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error("must start with a frontmatter block between --- lines");
  const data = {};
  let listKey = null;
  for (const raw of match[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const item = raw.match(/^\s+-\s+(.*)$/);
    if (item) {
      if (!listKey) throw new Error(`list item without a key: "${raw.trim()}"`);
      data[listKey].push(unquote(item[1]));
      continue;
    }
    const pair = raw.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!pair) throw new Error(`can't read frontmatter line: "${raw.trim()}"`);
    const [, key, value] = pair;
    if (value === "") {
      data[key] = [];
      listKey = key;
    } else {
      listKey = null;
      data[key] = /^\[.*\]$/.test(value)
        ? value.slice(1, -1).split(",").map((v) => unquote(v)).filter(Boolean)
        : unquote(value);
    }
  }
  return { data, body: match[2] };
}

function unquote(value) {
  const v = value.trim();
  return /^(".*"|'.*')$/.test(v) ? v.slice(1, -1) : v;
}

/** Markdown → HTML. Raw HTML in a post is shown as text, never run, and images aren't supported yet. */
export function renderMarkdown(markdown) {
  const problems = [];
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      html({ text }) {
        return escapeHtml(text);
      },
      link({ href, tokens }) {
        const inner = this.parser.parseInline(tokens);
        if (!SAFE_HREF.test(href)) {
          problems.push(`link to "${href}" must start with https://, http://, /, # or mailto:`);
          return inner;
        }
        const external = /^https?:\/\//i.test(href);
        return `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${inner}</a>`;
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        if (depth === 1) problems.push(`"# ${inner}" is an H1; the title comes from the frontmatter, so start headings at ##`);
        return `<h${depth} id="${slugify(inner)}">${inner}</h${depth}>\n`;
      },
      image({ href }) {
        problems.push(`image "${href}" isn't supported yet; remove it`);
        return "";
      },
    },
  });
  return { html: marked.parse(markdown), problems };
}

const wordCount = (markdown) => (markdown.replace(/[#*_`>|[\]()-]/g, " ").match(/\S+/g) ?? []).length;

/**
 * Checks one post and returns the record the site uses, or the list of problems to fix.
 * `slug` comes from the file name.
 */
export function buildPost(slug, source) {
  const problems = [];
  let data, body;
  try {
    ({ data, body } = parseFrontmatter(source));
  } catch (err) {
    return { problems: [err.message] };
  }

  const text = (key) => (typeof data[key] === "string" ? data[key].trim() : "");
  const list = (key) => (Array.isArray(data[key]) ? data[key] : []);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) problems.push(`file name "${slug}" must be lowercase words joined by hyphens`);

  const title = text("title");
  if (!title) problems.push("title is missing");
  else if (title.length > LIMITS.titleMax) problems.push(`title is ${title.length} characters; keep it to ${LIMITS.titleMax} so Google doesn't cut it off`);

  const description = text("description");
  if (!description) problems.push("description is missing");
  else if (description.length < LIMITS.descriptionMin || description.length > LIMITS.descriptionMax) {
    problems.push(`description is ${description.length} characters; aim for ${LIMITS.descriptionMin}–${LIMITS.descriptionMax}`);
  }

  const date = text("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) problems.push("date must look like 2026-09-30");
  const updated = text("updated");
  if (updated && (!/^\d{4}-\d{2}-\d{2}$/.test(updated) || Number.isNaN(Date.parse(updated)))) problems.push("updated must look like 2026-09-30");

  const type = text("type");
  if (!TYPES.includes(type)) problems.push(`type must be one of: ${TYPES.join(", ")}`);

  const status = text("status") || "published";
  if (!["draft", "published"].includes(status)) problems.push("status must be draft or published");

  const tool = text("tool");
  if (tool && !TOOL_SLUGS.includes(tool)) problems.push(`tool "${tool}" isn't a GifSuite tool (${TOOL_SLUGS.join(", ")})`);

  const tags = list("tags");
  if (tags.length === 0) problems.push("tags needs at least one tag, e.g. tags: [gif, x]");

  const sources = list("sources").map((line) => {
    const [name, url] = line.split(/\s+\|\s+/);
    if (!name || !url || !/^https?:\/\/\S+$/.test(url)) {
      problems.push(`source "${line}" must look like: Title of the page | https://…`);
      return null;
    }
    return { title: name, url };
  }).filter(Boolean);
  if (type === "history" && sources.length < LIMITS.historyMinSources) {
    problems.push(`history posts need at least ${LIMITS.historyMinSources} sources; this has ${sources.length}`);
  }
  if (type === "history" && status === "published" && text("reviewedBy") === "") {
    problems.push("history posts need reviewedBy: <name of the person who fact-checked it> before they're published");
  }

  const words = wordCount(body);
  const minWords = type === "history" ? LIMITS.historyMinWords : LIMITS.tipMinWords;
  if (words < minWords) problems.push(`body is ${words} words; ${type || "this"} posts need at least ${minWords}`);

  const rendered = renderMarkdown(body);
  problems.push(...rendered.problems);

  if (problems.length) return { problems };
  return {
    post: {
      slug, title, description, date, updated: updated || null, type, tags, tool: tool || null, sources,
      reviewedBy: text("reviewedBy") || null,
      draft: status === "draft",
      readingMinutes: Math.max(1, Math.round(words / 220)),
      html: rendered.html,
    },
  };
}

/** Reads every post in `dir`. Files starting with `_` are templates and are skipped. */
export function buildAll(dir, { drafts = false } = {}) {
  const posts = [];
  const errors = [];
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_")).sort() : [];
  for (const file of files) {
    const result = buildPost(file.replace(/\.md$/, ""), fs.readFileSync(path.join(dir, file), "utf8"));
    if (result.problems) errors.push({ file, problems: result.problems });
    else if (drafts || !result.post.draft) posts.push(result.post);
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
  return { posts, errors };
}

function main() {
  const drafts = process.argv.includes("--drafts");
  const { posts, errors } = buildAll(CONTENT_DIR, { drafts });
  if (errors.length) {
    console.error("\n✋ Blog posts need fixing:\n");
    for (const { file, problems } of errors) {
      console.error(`  content/blog/${file}`);
      for (const p of problems) console.error(`    - ${p}`);
    }
    console.error("");
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(posts, null, 2) + "\n");
  console.log(`blog: ${posts.length} post${posts.length === 1 ? "" : "s"} built${drafts ? " (including drafts)" : ""}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
