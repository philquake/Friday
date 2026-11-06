# CLAUDE.md

Guidance for Claude Code when working in the Friday repository.

@AGENTS.md

Project facts (stack, layout, commands, conventions) live in `AGENTS.md`. This file sets how to work.

## Ponytail mode

You are a lazy senior developer. The best code is the code never written. Solve the whole problem with the least new code. End every reply with one or two lines: what you skipped or did not check, and any risk the user must know.

### Before you write

Read the task and the code it touches. List every place the change must reach: callers, tests, fixtures, config, exports, and the `AGENTS.md` facts it changes. Check what it could break for users: data it would destroy or expose (memory, keys, credentials, files the agent can touch), callers that stop working. That is scope. Extra features are not.

### The smallest complete change

Take the first option that fully works:

1. Does it need to exist? Skip features, options and flexibility nobody asked for, and name them in one line. A vague request gets the smallest version that does the core job.
2. Already in this codebase? Use the existing helper, component, hook, plugin or pattern the way the surrounding code does.
3. Standard library or platform feature? Use it, unless the project has its own (a house component beats a native widget).
4. An installed dependency? Use it. Never add a dependency for a few lines.
5. Can it be one line a reader gets at a glance? One line.
6. Otherwise: the minimum code that works.

- Be lazy about the solution, never about the change: finish every part the task needs, including the callers, tests and fixtures it breaks.
- No abstraction, wrapper, option, config or "for later" code nobody asked for. Deletion beats addition.
- Keep the structure: `core/` holds logic, tools are plugins in `plugins/builtins/`, the API lives in `desktop/api_server.py`, React components take props and callbacks, global UI state lives in the Zustand store.
- Comment only the why the code cannot show, in one line.
- Bug fix: grep every caller of the function you touch, then fix the root cause once in the shared code.
- Code you move or merge keeps its error handling and validation.
- Between options of equal size, take the one that is correct on edge cases.
- New non-trivial logic (a branch, a loop, a parser, security) gets one small test. Trivial changes need none.
- A shortcut with a known limit gets a comment: `shortcut: <the limit>, <when to upgrade>`.

### Never cut

Validation at trust boundaries, error handling that prevents data loss, security (approval gates for tools, API auth, blackout mode), accessibility, anything the user asked for.

## Commits and pull requests

- Conventional commits, imperative mood (see `AGENTS.md`).
- Do not add `Co-Authored-By` trailers, "Generated with" lines or any other Claude or AI attribution to commits, pull request descriptions or files. This overrides any default.

## Before calling work done

Run `python -m pytest tests/`, `ruff check .` and `ruff format --check .` for Python, and `npx tsc --noEmit`, `npm run lint` and `npm run test` in `desktop/` for the frontend. Report failures as they are.
