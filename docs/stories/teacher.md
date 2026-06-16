# Teacher Stories

## T-01 Understand project

As a teacher, I want to open README and understand what the project does.

Acceptance:

- README has description, stack, env, commands and demo flow.

## T-02 Understand architecture

As a teacher, I want to open architecture docs and understand data flow.

Acceptance:

- `docs/architecture/README.md` describes flow and entities.
- Supabase tables are documented.

## T-03 Check scope

As a teacher, I want to see what is not included in MVP.

Acceptance:

- Specs and rules clearly say no CRM, no warehouse, no cash register.

## T-04 Run checks

As a teacher, I want to run lint, tests and build.

Acceptance:

- Commands are listed in README.
- Commands pass.

## T-05 Review plans

As a teacher, I want to see active and completed plans.

Acceptance:

- `docs/plans/active.md` exists.
- `docs/plans/completed.md` exists.
- `docs/plans/README.md` links to them.
