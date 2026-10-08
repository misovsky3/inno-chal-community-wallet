# Community Wallet

An MVP starter with an Angular frontend and a FastAPI backend. The backend exposes a health check and includes a CSV-backed store scaffold for future features.

## Run the backend

```bash
cd backend
python -m pip install -r requirements.txt
python app.py
```

The API runs at `http://localhost:8000`; check it at `http://localhost:8000/api/health`.

## Current API

- `GET /api/users` lists the five anonymous demo users.
- `GET /api/accounts` lists community accounts.
- `GET /api/users/{user_id}/accounts` lists accounts and roles for a demo user.
- `GET /api/accounts/{account_id}/members` lists account members and their roles.
- `GET /api/accounts/{account_id}/organizations` lists legal entities linked to an account.
- `GET /api/accounts/{account_id}/goals` lists goals with computed progress and status.
- `GET /api/accounts/{account_id}/transactions` lists transactions. Optional filters: `date_from`, `date_to`, `direction` (`all`, `credit`, `debit`) and `q`.
- `GET /api/accounts/{account_id}/contributions` returns member payment statuses and paid-member totals.
- `POST /api/accounts/{account_id}/contributions` creates a demo contribution request.
- `GET/POST /api/accounts/{account_id}/polls` lists polls or creates one (creator demo user ID must have the admin role).
- `POST /api/polls/{poll_id}/votes` casts or changes a member's vote before the poll closes; responses contain aggregate counts only.
- `POST /api/accounts/{account_id}/invitations` creates a read-only invite. The response includes `invite_path` for the frontend QR code.
- `GET /api/invitations/{token}` previews an invite; `POST /api/invitations/{token}/accept` joins a demo user as read-only; `DELETE /api/invitations/{token}?revoked_by_user_id=...` revokes it.

This is a public, no-login demo. Write endpoints accept demo user IDs in request data, so those IDs can be spoofed; do not use this implementation for real accounts. Invitations only grant `read_only`. Votes can be changed until closing, and the API returns aggregate counts without voter identities. The invite response gives the path to encode as a QR code; the frontend should render the QR image.

CSV files in `backend/data` keep users, accounts, memberships, organizations, account-organization links, goals, transactions, contributions, polls, poll options, votes, and invitations separately. Goal and contribution progress is calculated from linked transactions; temporary goals expire after their end date if not completed. Sample account identifiers and counterparties are anonymized.

## Run the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200`. The Angular dev server proxies `/api` requests to the backend at `http://localhost:8000`, so start the backend to see the health check succeed.

## Deploy the demo

The included Render blueprint and GitHub Actions workflow deploy the API to Render and the Angular app to GitHub Pages.

1. Create a Render service from `render.yaml` and copy its public URL.
2. In GitHub repository settings, set the Actions variable `API_BASE_URL` to that URL (without a trailing slash).
3. Create a Render deploy hook and add it as the Actions secret `RENDER_DEPLOY_HOOK`.
4. Set GitHub Pages to use **GitHub Actions** as its build and deployment source.
5. Push to `main` or run the **Build and deploy demo** workflow manually.

The Render free service uses an ephemeral filesystem. CSV changes such as votes, invitations, and contributions may reset after a restart or deployment; the committed CSV files provide the initial demo data.
