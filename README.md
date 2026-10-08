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
- `POST /api/accounts/{account_id}/polls/proposals` starts a funding proposal with an amount, details, and optional PDF attachment. Proposals use `Za`/`Proti` voting options; PDFs are limited to 5 MB.
- `GET /api/polls/{poll_id}/attachment` downloads a proposal's PDF attachment.
- `POST /api/polls/{poll_id}/votes` casts or changes a member's vote before the poll closes; responses contain aggregate counts only.
- `POST /api/accounts/{account_id}/invitations` creates a read-only invite. The response includes `invite_path` for the frontend QR code.
- `GET /api/invitations/{token}` previews an invite; `POST /api/invitations/{token}/accept` joins a demo user as read-only; `DELETE /api/invitations/{token}?revoked_by_user_id=...` revokes it.
- `POST /api/notifications` sends a demo notification to a user, optionally linked to an account.
- `GET /api/users/{user_id}/notifications?status=all|new|read` lists that user's notifications.
- `POST /api/notifications/{notification_id}/read` marks a notification read for its recipient.

This is a public, no-login demo. Write endpoints accept demo user IDs in request data, so those IDs can be spoofed; do not use this implementation for real accounts. Invitations only grant `read_only`. Votes can be changed until closing, and the API returns aggregate counts without voter identities. The invite response gives the path to encode as a QR code; the frontend should render the QR image.

CSV files in `backend/data` keep users, accounts, memberships, organizations, account-organization links, goals, transactions, contributions, polls, poll options, votes, invitations, and notifications separately. Notification status is derived from `read_at`; an empty value means `new`. Poll proposal PDFs are stored in `backend/data/poll_attachments`. Goal and contribution progress is calculated from linked transactions; temporary goals expire after their end date if not completed. Sample account identifiers and counterparties are anonymized.

## Run the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200`. The Angular dev server proxies `/api` requests to the backend at `http://localhost:8000`, so start the backend to see the health check succeed.
