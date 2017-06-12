## Dependencies

- Node 7+
- PostgreSQL 9.x

## Setup

1. Clone and bootstrap

    ```sh
    git clone https://github.com/atom/real-time-server.git ~/github/real-time-server
    cd ~/github/real-time-server
    cp .env.example .env
    createdb real-time-server-dev
    npm install
    npm run migrate up
    ```

2. Setup Pusher
  1. Ask @as-cii, @nathansobo, or @jasonrudolph to add you as a collaborator on the [tachyon-development app](https://dashboard.pusher.com/apps/348824).
  2. Copy [the key and secret from Pusher](https://dashboard.pusher.com/apps/348824/keys), and set those values in your `.env` file.

3. Start the server

    ```sh
    ./script/start
    ```
