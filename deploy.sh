#!/bin/sh
source ~/.bashrc
gcloud builds submit --tag gcr.io/bubblepop/api-nodejs
gcloud run deploy api-nodejs --image gcr.io/bubblepop/api-nodejs --add-cloudsql-instances bubblepop:us-central1:bubblepop-db-production   --update-env-vars INSTANCE_CONNECTION_NAME="bubblepop:us-central1:bubblepop-db-production",GOOGLE_APPLICATION_CREDENTIALS="./secrets/firebase-adminsdk.json" --platform managed --allow-unauthenticated
