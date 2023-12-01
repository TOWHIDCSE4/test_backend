#!/bin/sh

echo "Start CI backend stg"
docker build -t docker.pkg.github.com/ispeakvn/ispeak-backend/ispeak-backend:staging -f Dockerfile-stg .
docker push docker.pkg.github.com/ispeakvn/ispeak-backend/ispeak-backend:staging
echo "Done CI"