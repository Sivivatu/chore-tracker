---
name: pr-check-comments
description: Check and resolve review comments on the pull request for the current branch. Use when the user asks to check PR comments, review comments, address comments, fix reviewer feedback, resolve Graphite/GitHub PR comments, or update a published PR with comment-driven corrections.
---

# PR Check Comments

## Objective

Find the published PR for the current branch, retrieve unresolved review feedback, make the requested corrections, verify them, submit the updates through the repository's configured PR workflow, resolve each reviewer thread on GitHub, and report each comment's resolution in chat.

## Workflow

1. Inspect the repository workflow before changing files.
   - Read local agent instructions such as `AGENTS.md`, `CLAUDE.md`, or repository docs when present.
   - Respect repository-specific submit rules. If the repo uses Graphite, use `gt` for commit, branch, push, and submit operations.
   - Use read-only Git commands freely for orientation.

2. Identify the current PR.
   - Run `git branch --show-current` and inspect remotes.
   - Prefer `gh pr view --json number,url,headRefName,baseRefName,state,isDraft,title` when GitHub CLI is available.
   - If Graphite is configured, also inspect `gt log short` or `gt status` when useful.
   - If no PR exists for the current branch, stop and tell the user clearly.

3. Retrieve review comments.
   - Fetch line comments with `gh api repos/<owner>/<repo>/pulls/<number>/comments`.
   - Fetch review summaries with `gh api repos/<owner>/<repo>/pulls/<number>/reviews`.
   - Fetch issue-style PR comments with `gh api repos/<owner>/<repo>/issues/<number>/comments`.
   - Include unresolved comments where possible. GitHub's REST API does not always expose Graphite/GitHub thread resolution state cleanly, so treat recent unresolved-looking or actionable comments as candidates.
   - Ignore purely complimentary, already-obsolete, or non-actionable comments unless the user explicitly asks for a full comment audit.

4. Build a comment action list.
   - For each actionable comment, record the author, URL, file/path if present, line or diff hunk if present, exact concern, and intended fix.
   - Group duplicate comments that share the same root cause, but preserve the mapping back to each comment.
   - If a comment is ambiguous, inspect surrounding code and infer the safest fix. Ask the user only when a reasonable implementation cannot be determined.

5. Implement corrections.
   - Read the relevant files before editing.
   - Keep edits scoped to the reviewed concern and directly related tests.
   - Preserve unrelated user changes and do not revert unrelated work.
   - Add or update tests when the comment identifies a behavioural bug, regression risk, or edge case.
   - Use the repository's established style and helpers.

6. Verify.
   - Run the narrowest useful tests for the changed areas first.
   - Run broader project checks when the fixes affect shared behaviour, when comments were about correctness, or before submitting.
   - Record each command and result for the final response.

7. Submit updates.
   - If the repository uses Graphite, stage explicit files and use `gt modify --commit` for follow-up commits, then `gt submit`.
   - Otherwise follow the repository's documented workflow.
   - Do not use `git push`, `git commit`, or `gh pr create` when repo instructions require Graphite.
   - Update the PR body if the previous body is stale or if verification status changed materially.
   - Leave a concise PR comment summarising which reviewer comments were addressed when appropriate.

8. Resolve review threads.
   - For every comment that has been addressed, post a reply on its thread in plain English describing what was changed and why it resolves the concern, and include the relevant commit SHA(s) (e.g. "Fixed in commit abc1234. …").
   - After posting the reply, resolve the thread via the GitHub GraphQL API:
     1. Fetch thread IDs (see Useful Commands below).
     2. Resolve each thread with the `resolveReviewThread` GraphQL mutation.
   - Only resolve threads where the fix has been verified and pushed. Leave unaddressed threads open.

9. Report in chat.
   - Lead with whether the PR was updated/submitted and the PR URL.
   - Then list each addressed comment with:
     - comment source: author, file/line or URL
     - change made
     - why it resolves the concern
     - verification output relevant to that change
     - whether the thread was resolved on GitHub
   - Separately list comments not changed, with the reason.
   - Mention remaining CI status, preview status, and any local working-tree caveats.

## Useful Commands

Use these as starting points and adapt to the repository:

```bash
git status --short --branch
git branch --show-current
gh pr view --json number,url,headRefName,baseRefName,state,isDraft,title
gh pr checks <number>
gh api repos/<owner>/<repo>/pulls/<number>/comments
gh api repos/<owner>/<repo>/pulls/<number>/reviews
gh api repos/<owner>/<repo>/issues/<number>/comments

# Post a reply on a review thread
gh api repos/<owner>/<repo>/pulls/<number>/comments \
  -X POST \
  -f body="Fixed in commit <sha>. <plain-english description>" \
  -F in_reply_to=<comment_id>

# Get review thread IDs (needed for resolution)
gh api graphql -f query='{
  repository(owner: "<owner>", name: "<repo>") {
    pullRequest(number: <n>) {
      reviewThreads(first: 50) {
        nodes { id isResolved comments(first: 1) { nodes { databaseId } } }
      }
    }
  }
}'

# Resolve a review thread
gh api graphql -f query='mutation {
  resolveReviewThread(input: {threadId: "<PRRT_...>"}) {
    thread { isResolved }
  }
}'
```

For Graphite repositories:

```bash
gt log short
gt modify --commit -m "<conventional commit message>" --no-interactive
gt submit --no-edit --no-interactive
```

## Reporting Template

```text
Updated PR: <url>

Addressed comments:
- <author> on <file:line or URL>: <concern>
  Change: <what changed>
  Why: <why this resolves it>
  Verification: `<command>` <passed/failed and key output>
  Resolution: replied with fix summary (commit <sha>) + thread resolved on GitHub

Not changed:
- <comment>: <reason>

Checks:
- `<command>`: <result>
- CI: <status>
```
