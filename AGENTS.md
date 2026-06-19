## Git And Pull Request Workflow

This repository uses Graphite for branch, commit, stack, push, and pull request
operations. When asked to create, update, submit, or publish work, use `gt`
commands for the workflow.

- Use `gt create` for new logical branches and commits.
- Use `gt modify --commit` for additional commits on an existing Graphite
  branch.
- Use `gt submit` to push branches and create or update pull requests.
- Do not use `git commit`, `git push`, or `gh pr create` as substitutes for
  Graphite operations.
- Plain `git` commands are fine for read-only inspection such as `git status`,
  `git diff`, `git log`, and for staging explicit files before a `gt` command.
- If an existing branch is not tracked by Graphite, run `gt track` with the
  correct parent before modifying or submitting it.
- Keep commits atomic and stage explicit files rather than using broad staging
  when the working tree might contain unrelated changes.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
