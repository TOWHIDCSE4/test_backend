#!/bin/sh

echo "Start CI backend prod"
docker build -t docker.pkg.github.com/ispeakvn/ispeak-backend/ispeak-backend:dev -f Dockerfile .
docker push docker.pkg.github.com/ispeakvn/ispeak-backend/ispeak-backend:dev
echo "Done CI"