#!/bin/sh
docker-compose -p 'coding4girls' --file docker-compose.dev.yml up --build -d "$@"