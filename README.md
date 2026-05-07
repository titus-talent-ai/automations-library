# Titus Talent Strategies, AI Skill Library

Internal documentation hub for the AI skill library at Titus Talent Strategies. Static site, hosted on GitHub Pages, audience is the Titus team and leadership.

This repo contains documentation only. The skill code itself lives elsewhere.

> **Public-page note**: this site is publicly accessible via GitHub Pages. Do not embed personal email addresses, Teams deep links, phone numbers, or any other contact mechanism that scrapers can abuse. The contribute CTA intentionally tells readers to find Koal inside the Titus Teams directory rather than offering a clickable link.

## What's in here

```
index.html              The page
styles.css              Design tokens, component styles
skills.json             The skills directory (edit to add/remove/update)
roadmap.json            Upcoming skills
decision-trees.json     Comparisons between overlapping skills
changelog.json          Recent changes, reverse chronological
```

No build step. No npm. Edit the JSON, commit, push, and the live site updates.

## Editing content

### Add a new skill

Open `skills.json` and append an object to the array:

```json
{
  "name": "skill-name",
  "purpose": "One-line description of what it does.",
  "trigger_phrases": ["phrase 1", "phrase 2"],
  "status": "live",
  "domain": "document-creation",
  "added_date": "2026-05-15"
}
```

Field reference:

| Field             | Required | Notes |
|-------------------|----------|-------|
| `name`            | yes      | The skill identifier, lowercase with hyphens |
| `purpose`         | yes      | One sentence, what it produces |
| `trigger_phrases` | yes      | Array of strings, what users say to invoke it |
| `status`          | yes      | `live`, `beta`, or `deprecated` |
| `domain`          | yes      | One of the keys in `DOMAIN_CONFIG` (see below) |
| `added_date`      | no       | ISO date `YYYY-MM-DD`, shown in the card footer |

### Mark a skill deprecated

Change `status` from `live` to `deprecated`. The card stays in the directory but renders in a muted style with a strike-through badge. Add a changelog entry the same day.

### Update the roadmap

Append to `roadmap.json`:

```json
{
  "name": "Skill Name",
  "category": "Document Creation",
  "target_date": "2026-07-15",
  "description": "Short one-liner on what it will do.",
  "priority": "high"
}
```

`priority` is `high`, `medium`, or `low`. Items are sorted ascending by `target_date` automatically.

### Update the changelog

Prepend to `changelog.json`:

```json
{
  "date": "2026-05-15",
  "type": "added",
  "note": "Plain-language note on what changed."
}
```

`type` is one of: `launch`, `added`, `updated`, `renamed`, `deprecated`. Entries are sorted by date descending automatically, but it's still good practice to add new entries at the top.

### Add a new domain category

Edit the `DOMAIN_CONFIG` object near the top of the `<script>` block in `index.html`:

```js
const DOMAIN_CONFIG = {
  'document-creation':    { label: 'Document Creation' },
  'candidate-evaluation': { label: 'Candidate Evaluation' },
  'partner-intelligence': { label: 'Partner Intelligence' },
  'skill-operations':     { label: 'Skill Operations' },
  'automation':           { label: 'Automation' },
  'internal-tools':       { label: 'Internal Tools' },
  'your-new-domain':      { label: 'Your New Domain' },
};
```

The order in this object controls the render order on the page. The key (lowercase, hyphenated) is what you put in a skill's `domain` field.

### Add a decision tree entry

Append to `decision-trees.json`:

```json
{
  "question": "Performance Profile or Executive Performance Profile?",
  "context": "Both are role marketing documents but they're built for different audiences.",
  "options": [
    {
      "skill": "performance-profile",
      "use_when": "Non-executive search. Multi-page, client-branded with logo and colors. Default choice."
    },
    {
      "skill": "executive-performance-profile",
      "use_when": "C-suite or VP/Director and above. Two-page Titus-branded narrative document."
    }
  ]
}
```

## Updating the page header date

The hero shows "Updated [date]" and so does the footer. Edit two strings in `index.html`:

1. The hero meta block, look for `Updated May 7, 2026`
2. The footer, look for `id="footer-updated"`

## Deploying

GitHub Pages serves the `main` branch root. After committing, the live site updates within a minute or two. There is no build pipeline.

## Maintained by

Koal Robson, Director of AI Operations, Titus Talent Strategies.
