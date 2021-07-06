# d-wallet-db
Make "mongo-init-dev.js / mongo-init-local.js / mongo-init-prod.js"

Copy from mongo-init-dev-sample.js

Copy .env from .env.sample and change MONGO_INITDB_ROOT_PASSWORD


# Usage
```shell
cd d-wallet-api/db
docker-compose -f docker-compose-dev.yml up -d
```