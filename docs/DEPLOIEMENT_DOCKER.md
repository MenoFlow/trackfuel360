# Deploiement Docker TrackFuel360

## Services

- `db`: MySQL 8 avec volume nomme `db_data`.
- `app`: API Express sur le port `8086`.
- `frontend`: build Vite servi par Nginx sur le port `8087`.

## Variables

Copier `.env.example` en `.env` puis adapter:

```env
MYSQL_ROOT_PASSWORD=change-me-root
MYSQL_DATABASE=hermenio_db
MYSQL_USER=hermenio_user
MYSQL_PASSWORD=change-me
CORS_ORIGINS=http://localhost:8087,https://trackfuel360.com
VITE_API_BASE_URL=http://localhost:8086
```

## Uploads persistants

Le compose monte le dossier hote complet:

```yaml
./trackfuel-backend/uploads:/app/uploads
```

Consequences:
- les fichiers restent dans `/home/menio_0/Documents/SOOZEY/trackfuel360/trackfuel-backend/uploads`;
- `docker compose restart app` ne les supprime pas;
- `docker compose up -d --build` ne les supprime pas;
- ils ne sont pas embarques dans l'image grace a `.dockerignore`.

Ne pas supprimer manuellement `trackfuel-backend/uploads` ni remplacer le bind mount par un volume ephemere si les fichiers doivent rester accessibles sur l'hote.

## Commandes

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Verification rapide:

```bash
docker compose restart app
find trackfuel-backend/uploads -maxdepth 3 -type f
```
