# Coding4Girls Backend

## Services

### REST API

The REST API is written in NodeJS using ExpressJS, in TypeScript.

### Postgres

Postgres is the database we use in this project and keeps persistant storage in the `dbdata` folder located in the root of this folder.

### Redis

Redis is used for caching things (currently images) and the configuration of it is located in the `redis` folder.

## Requirements

This project runs on **docker** and uses **docker-compose**.

Everything else is handled by the docker containers.

## Environment variables

Credentials and sensitive stuff are placed in a _.env_ file where docker-compose reads it automatically and uses them in the containers.

Variables we use in Coding4Girls backend are:

- POSTGRES_USER
  - The user of the database (Postgres creates a database with that username too and we use that by default)
- POSTGRES_PASSWORD
  - The password of the database
- JWT_ENCRYPTION_KEY
  - The encryption key used to sign the token that verifies an authenticated user
- IMGUR_API_KEY
  - The ClientID from Imgur API we use to upload images

## Start & Stop

Starting and stopping the backend is done using the scripts found in the `bin` folder.

More specificaly:

- bin/start_dev.sh
  - Starts the backend in development mode where the node api exposes the debug port on 9222
- bin/start.sh
  - Starts the backend in production mode
- bin/stop.sh
  - Stops and deletes the created containers and network.

## Ports

### Postgres

You can connect to Postgres using the following ports

- 5431
  - This port is exposed in the production environment
  - Maps to the 5432 internally
  - Containers that are inside the network of the database (like the REST API) should use the port 5432
- 5432
  - This is the default port that Postgres uses and is used in the dev environment

### REST API

The REST API uses the following ports

- 5000
  - This port is exposed in the dev environment and is the default port
- 5001
  - This port is exposed in the production environment
  - Maps to port 5000 internally
