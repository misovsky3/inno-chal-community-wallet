# Community Wallet Data Model

The backend stores its demo data in CSV files under `backend/data`. The diagram shows the logical relationships between those files; CSV does not enforce foreign keys or unique constraints itself.

```mermaid
erDiagram
    USER ||--o{ MEMBERSHIP : joins
    ACCOUNT ||--o{ MEMBERSHIP : has

    ACCOUNT ||--o{ ACCOUNT_ORGANIZATION : links
    ORGANIZATION ||--o{ ACCOUNT_ORGANIZATION : linked_to

    ACCOUNT ||--o{ GOAL : defines
    ACCOUNT ||--o{ TRANSACTION : records
    USER o|--o{ TRANSACTION : pays
    GOAL o|--o{ TRANSACTION : funds
    CONTRIBUTION o|--o{ TRANSACTION : settled_by

    ACCOUNT ||--o{ CONTRIBUTION : requests
    USER ||--o{ CONTRIBUTION : owes
    GOAL o|--o{ CONTRIBUTION : for_goal

    ACCOUNT ||--o{ POLL : has
    POLL ||--|{ POLL_OPTION : offers
    POLL ||--o{ VOTE : receives
    USER ||--o{ VOTE : casts
    POLL_OPTION ||--o{ VOTE : selected_in

    ACCOUNT ||--o{ INVITATION : issues
    USER ||--o{ INVITATION : creates

    USER {
        int id PK
        string name
        string email
    }

    ACCOUNT {
        int id PK
        string name
        string iban
        decimal balance
        string currency
        string payme_url
    }

    MEMBERSHIP {
        int account_id PK, FK
        int user_id PK, FK
        string role
    }

    ORGANIZATION {
        int id PK
        string name
    }

    ACCOUNT_ORGANIZATION {
        int account_id PK, FK
        int organization_id PK, FK
    }

    GOAL {
        int id PK
        int account_id FK
        string name
        string goal_type
        decimal target_amount
        string currency
        date start_date
        date end_date
        string description
    }

    TRANSACTION {
        int id PK
        int account_id FK
        int goal_id FK
        int payer_user_id FK
        int contribution_id FK
        date date
        decimal amount
        string currency
        string counterparty
        string direction
        string payment_type
        string details
        string recipient_message
        string variable_symbol
        string payer_reference
    }

    CONTRIBUTION {
        int id PK
        int account_id FK
        int user_id FK
        int goal_id FK
        decimal amount
        string currency
        date due_date
    }

    POLL {
        int id PK
        int account_id FK
        string question
        string description
        datetime created_at
        datetime closes_at
    }

    POLL_OPTION {
        int id PK
        int poll_id FK
        string label
    }

    VOTE {
        int poll_id PK, FK
        int user_id PK, FK
        int option_id FK
        datetime updated_at
    }

    INVITATION {
        string token PK
        int account_id FK
        string role
        int created_by_user_id FK
        datetime created_at
        datetime expires_at
        int max_uses
        int used_count
        datetime revoked_at
    }
```

## CSV Files

| File | Purpose |
| --- | --- |
| `users.csv` | Demo people who may participate in communities |
| `accounts.csv` | Community accounts and their displayed balance/payment details |
| `memberships.csv` | User-to-account relationship and that user's role on that account |
| `organizations.csv` | Legal entities |
| `account_organizations.csv` | Links legal entities to community accounts |
| `goals.csv` | Permanent or temporary account goals |
| `transactions.csv` | Credits and debits recorded on an account |
| `contributions.csv` | Expected contribution amount per account member |
| `polls.csv` | Poll question, account and closing time |
| `poll_options.csv` | Choices offered by a poll |
| `votes.csv` | One changeable vote per user and poll until closing |
| `invitations.csv` | Expiring, use-limited read-only invite links |

## Derived Data and Limitations

- `memberships.role` is scoped to one account. A user can be an `admin` in one account and `read_only` in another.
- Goal progress and contribution payment status are calculated from linked credit transactions; those totals/statuses are not stored in their CSV files.
- Vote rows retain `user_id` to enforce one vote per member, but poll API responses expose aggregate counts only. Votes may be changed until the poll closes.
- Invitations grant only `read_only`; the returned `invite_path` is intended to be encoded as a QR code by the frontend.
- This is a public demo without authentication. User IDs supplied to write endpoints can be spoofed, so role checks are illustrative and not suitable for real financial accounts.
- Account ownership is not modeled yet. `account_organizations.csv` means an organization is associated with an account; it does not prove legal ownership. Transaction `counterparty` is currently free text.
- The IBANs in demo data are intentionally invalid and must not be used for payments.