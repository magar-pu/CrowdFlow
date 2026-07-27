# CrowdFlow Workspace Rules

Any agent executing tasks in this codebase must adhere to the rules defined in the `.agents/` directory:
- [01. Instructions and Safeguards](file:///.agents/01_instructions_and_safeguards.md)
- [02. Code Security and Scalability](file:///.agents/02_code_security_and_scalability.md)
- [03. API Clean Code Guidelines](file:///.agents/03_api_clean_code.md) (Mandatory for any changes involving frontend/backend API calls, response models, or proxy configuration)
- [04. Authentication and Redirection Patterns](file:///.agents/04_authentication_and_redirection_patterns.md) (Mandatory for any changes to user login, signup, redirects, or session flow)

## Docker Deployment Rule
- **NEVER** run `docker compose up --build -d` or any other `docker` / `docker compose` command automatically.
- After making code changes, provide the exact command for the user to run manually:
  ```
  docker compose up --build -d
  ```

## Commit Rule
- **NEVER** run `git commit`, `git push`, or any commit/push command automatically.
- All commits must be made **manually by the user**. Simply report what changed after completing a task.