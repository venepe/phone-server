# Your relationship deserves a number
## Readme

### Getting Started

```
export DATABASE_URL=postgresql://postgres:f4IPIg*3GIMz@35.224.70.228:5432/postgres
export DATABASE_URL=postgresql://postgres:supersecretpswd@localhost:5432/postgres
docker-compose up
yarn
yarn migrate up
export POSTGRES_USER=postgres POSTGRES_PASSWORD=supersecretpswd POSTGRES_DATABASE=postgres
yarn watch
```

### Mutations

#### Create User
```
mutation($createUserInput:CreateUserInput!) {
  createUser(input:$createUserInput) {
    user {
      id
    }
  }
}
{
  "createUserInput": {
    "user": {
      "uid": "vernonpearson.8@gmail.com",
      "email": "vernonpearson.8@gmail.com"
    }
  }
}
```

### Query

#### All Users
```
query {
  allUsers {
    nodes {
      nodeId
      id      
    }
  }
}
```

### Building and Deploying to Google Cloud

```
source ~/.bashrc
```

```
gcloud builds submit --tag gcr.io/bubblepop/api-nodejs
```

```
gcloud run deploy --image gcr.io/bubblepop/api-nodejs   --add-cloudsql-instances bubblepop:us-central1:bubblepop-db-production   --update-env-vars INSTANCE_CONNECTION_NAME="bubblepop:us-central1:bubblepop-db-production" --platform managed --allow-unauthenticated
```

### Notes
On a mission to make us work
