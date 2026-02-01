# HomeForge - GitHub Copilot Instructions

## Project Overview

HomeForge is a smart home management application with a Django REST API backend and a Next.js React frontend. This document outlines coding standards, commit practices, and documentation requirements for the entire project.

---

## Commit Best Practices

### Commit Message Format

Use **Conventional Commits** format for all commit messages:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Commit Types

| Type       | Description                                          |
|------------|------------------------------------------------------|
| `feat`     | A new feature                                        |
| `fix`      | A bug fix                                            |
| `docs`     | Documentation only changes                           |
| `style`    | Formatting, missing semicolons, etc. (no code change)|
| `refactor` | Code change that neither fixes a bug nor adds feature|
| `perf`     | Performance improvements                             |
| `test`     | Adding or updating tests                             |
| `chore`    | Maintenance tasks, dependencies, configs             |
| `build`    | Changes affecting build system or dependencies       |
| `ci`       | CI/CD configuration changes                          |

### Scope

Use scope to indicate the affected area:

- `frontend` - Next.js/React changes
- `backend` - Django API changes
- `api` - API endpoint changes
- `ui` - UI component changes
- `db` - Database/migration changes
- `docker` - Docker configuration changes
- `auth` - Authentication related changes
- `devices` - Device management features
- `topology` - Topology/room features

### Commit Message Examples

```
feat(frontend): add device card component with status indicator

fix(backend): resolve device status validation error

docs(api): update API usage documentation for device endpoints

refactor(frontend): extract topology canvas into reusable hook

chore(docker): update Python base image to 3.12

feat(devices): implement custom device type creation workflow

Closes #123
```

### Commit Guidelines

1. **Keep commits atomic** - Each commit should represent a single logical change
2. **Write in imperative mood** - "Add feature" not "Added feature"
3. **Keep subject line under 72 characters**
4. **Reference issues** - Include issue numbers in footer when applicable
5. **Don't commit commented-out code** - Remove unused code before committing
6. **Test before committing** - Ensure the application builds and tests pass

---

## README.md Update Requirements

### When to Update README.md

The root `readme.md` must be updated with every significant commit that:

- Adds new features or functionality
- Changes installation or setup steps
- Modifies environment variables or configuration
- Updates dependencies with breaking changes
- Changes API contracts or endpoints
- Alters the project structure

### README Sections to Maintain

1. **Features List** - Keep the feature list current
2. **Installation Steps** - Update if setup process changes
3. **Environment Variables** - Document all required env vars
4. **API Endpoints** - Reference the API documentation
5. **Changelog** - Add dated entries for significant changes

### Changelog Format

Add changelog entries at the top of the changelog section:

```markdown
## Changelog

### [YYYY-MM-DD]
- **Added**: Brief description of new feature
- **Fixed**: Brief description of bug fix
- **Changed**: Brief description of modification
- **Removed**: Brief description of removed feature
```

---

## Branch Naming Convention

Use descriptive branch names following this pattern:

```
<type>/<issue-number>-<short-description>
```

Examples:
- `feat/42-device-card-component`
- `fix/87-login-validation-error`
- `refactor/103-api-client-cleanup`

---

## Pull Request Guidelines

1. **Title** - Use same format as commit messages
2. **Description** - Explain what, why, and how
3. **Screenshots** - Include for UI changes
4. **Testing** - Describe how changes were tested
5. **Breaking Changes** - Clearly document any breaking changes
6. **Checklist** - Verify all items before requesting review:
   - [ ] Code follows project style guidelines
   - [ ] Tests added/updated as needed
   - [ ] Documentation updated
   - [ ] README.md updated if applicable
   - [ ] No console.log or print statements left in code

---

## Project Structure

```
HomeForge/
├── .github/              # GitHub configurations & Copilot instructions
├── backend/              # Django REST API
│   ├── api/              # Main API application
│   ├── my_backend/       # Django project settings
│   └── requirements.txt  # Python dependencies
├── frontend/             # Next.js React application
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utilities and API client
├── docker-compose.yml    # Docker orchestration
└── readme.md             # Project documentation
```

---

## Environment Setup

When suggesting code changes, assume the following environment:

- **Backend**: Python 3.11+, Django 4.x, Django REST Framework
- **Frontend**: Node.js 18+, Next.js 14+, React 18+, TypeScript 5+
- **Database**: PostgreSQL (via Docker)
- **Containerization**: Docker & Docker Compose

---

## MCP Server Configuration

This project uses MCP (Model Context Protocol) servers to enhance GitHub Copilot capabilities. The configuration is stored in `.vscode/mcp.json` at the project root.

### Configured MCP Servers

| Server | Technology | Purpose |
|--------|------------|---------|
| **shadcn-ui** | Frontend | shadcn/ui component patterns and generation |
| **tailwindcss** | Frontend | Tailwind CSS utilities and configuration |
| **nextjs** | Frontend | Next.js App Router conventions |
| **react-query** | Frontend | TanStack Query patterns |
| **typescript** | Frontend | TypeScript type inference |
| **django** | Backend | Django ORM and patterns |
| **drf** | Backend | Django REST Framework |
| **postgresql** | Backend | Database queries and optimization |
| **python** | Backend | Python language features |
| **pytest** | Backend | Testing patterns |
| **ruff** | Backend | Python linting |
| **git** | Both | Git operations |
| **docker** | Both | Container configuration |

### Important Files (Must Be Tracked)

Ensure these files are **NOT** in `.gitignore`:

```
.vscode/mcp.json          # MCP server configuration
.github/copilot-instructions.md  # Root Copilot instructions
frontend/.github/copilot-instructions.md  # Frontend instructions
backend/.github/copilot-instructions.md   # Backend instructions
```

See the frontend and backend `copilot-instructions.md` files for technology-specific MCP server details.

---

## Code Review Checklist

Before approving changes, verify:

- [ ] Commit messages follow conventions
- [ ] README.md updated if needed
- [ ] No secrets or credentials in code
- [ ] Error handling is appropriate
- [ ] Code is properly typed (TypeScript/Python type hints)
- [ ] API changes are backward compatible or documented
