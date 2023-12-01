#!/bin/sh

echo "Start CI backend prod"
docker build -t docker.pkg.github.com/ispeakvn/ispeak-backend/ispeak-backend:main -f Dockerfile-Prod .
docker push docker.pkg.github.com/ispeakvn/ispeak-backend/ispeak-backend:main
echo "Done CI"