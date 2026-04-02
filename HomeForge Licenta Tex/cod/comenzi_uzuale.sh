# Rulare stack complet
docker compose up -d --build

# Oprire stack
docker compose down

# Build documentatie website
cd website && npm run build
