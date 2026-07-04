# Deploiement Docker TrackFuel360

## Services

- `db`: MySQL 8 avec volume nomme `db_data`.
- `app`: API Express disponible uniquement sur le reseau Docker interne, port conteneur `8086`.
- `frontend`: build Vite servi par Nginx sur le port public `8087`.

Seul le service `frontend` publie un port vers l'hote. Le backend et MySQL ne sont pas accessibles directement depuis l'exterieur de Docker.

## Variables

Copier `.env.example` en `.env` puis adapter:

```env
MYSQL_ROOT_PASSWORD=change-me-root
MYSQL_DATABASE=hermenio_db
MYSQL_USER=hermenio_user
MYSQL_PASSWORD=change-me
CORS_ORIGINS=http://localhost:8087,https://trackfuel360.com
VITE_API_BASE_URL=
```

`VITE_API_BASE_URL` doit rester vide en Docker. Le navigateur appelle `/api`, `/uploads`, `/bootstrap` et `/health` sur le meme domaine que le frontend; Nginx transfere ensuite ces requetes au backend interne `app:8086`.

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
curl http://localhost:8087/health
```

Les commandes suivantes ne doivent pas repondre depuis l'hote, car ces ports ne sont plus publies:

```bash
curl http://localhost:8086/health
mysql -h 127.0.0.1 -P 3307 -u hermenio_user -p
```
