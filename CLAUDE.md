# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in the Slim Minima repository.

Slim Minima is a minimal CMS built for marketers. The complete guide lives in
@AGENTS.md (shared with all coding agents): services to set up (Neon,
Cloudinary, Resend), commands, architecture, the block engine contract, content
model, the SEO/GEO checklist, the contact form, the media trash bin, retheming,
and CLI/REST reference. Read it before making changes.

Keep it minimal - that is the brand. No em dashes or en dashes, and no AI
vocabulary, in any generated copy, content, or UI.

## Git workflow

First decide which of these you are doing - they have opposite rules:

**Building a site on top of Slim Minima** (the common case: adding pages,
blocks, content, or retheming for an end user). **This repo is a template, not
your project, and its remote is not your repo.** Before you commit or push
anything, run `git remote -v`. If `origin` still points at a `slim-minima`
repository, STOP - that is the framework's repo. Do not commit a site's content
to it and never push to it. Have the user point `origin` at their own repo
(`git remote set-url origin <their-repo>`) or re-init git first, then push
there. When in doubt, do not push - ask.

**Developing Slim Minima itself** (editing the framework: `src/`, the block
engine, the admin, these docs - `origin` really is the Slim Minima repo and you
mean to push to it). Commit and push by default after a change, no need to ask.
Commit straight to the working branch, run `npm run typecheck` and `npm run
build` before committing, and push when the build is clean.
