# gatekeeper-policies-express

Express playground for `@matteophre/gatekeeper-policies`.

## Run

```bash
npm install
npm start
```

Default URL: `http://localhost:3001`

## API

- `GET /` service info
- `GET /demo/users` demo users
- `POST /password/validate` complexity validation
- `POST /password/change` complexity + history checks
- `GET /protected/profile` protected route with expiry middleware

## Quick checks

```bash
curl -X POST http://localhost:3001/password/validate -H "Content-Type: application/json" -d '{"password":"StrongGate#2026"}'
```

```bash
curl http://localhost:3001/protected/profile -H "x-user-id: alice"
```

## GitHub Actions

- `CI`: runs `npm ci` and `npm test` on push and pull requests
- `Manual Password Check`: `workflow_dispatch` with a `password` input
