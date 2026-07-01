# gatekeeper-policies-express

Playground Express per provare `@matteophre/gatekeeper-policies` in modo isolato.

## Avvio

```bash
npm install
npm start
```

Server di default su `http://localhost:3001`.

## Endpoint

- `GET /` stato servizio
- `GET /demo/users` utenti demo
- `POST /password/validate` validazione complessita
- `POST /password/change` cambio password con controllo history
- `GET /protected/profile` route protetta con expiry middleware

## Esempi veloci

```bash
curl -X POST http://localhost:3001/password/validate -H "Content-Type: application/json" -d '{"password":"StrongPassword#2026"}'
```

```bash
curl http://localhost:3001/protected/profile -H "x-user-id: alice"
```

## CI e test su GitHub Actions

- workflow `CI`: esegue `npm ci` + `npm test` su push e pull request
- workflow `Manual Password Check`: avvio manuale da Actions con input `password`

Se la password non rispetta la policy, il job fallisce mostrando il dettaglio della validazione.
