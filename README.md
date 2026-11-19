# Swyft URL Shortener

A small, self-hosted URL-shortening app with a responsive dashboard, custom aliases, persistent link storage, and click-counting redirects. It uses only Node.js built-ins, so there are no third-party packages to install.

## Run locally

1. Install Node.js 18 or newer.
2. From this folder, run `npm start`.
3. Open [http://localhost:3000](http://localhost:3000).

Set `PORT` to change the listening port. Set `PUBLIC_BASE_URL` to the public origin of the service when hosting it somewhere other than `http://localhost:3000` (for example, `https://short.example.com`). Short URLs use this configured origin.

## How it works

- `public/index.html` contains the dashboard, responsive styling, and browser-side JavaScript. It loads links from the API, submits the create form, filters the list, copies links, and refreshes the statistics.
- `server.js` serves the dashboard and implements the JSON API and redirect routes using Node's built-in HTTP, filesystem, and crypto modules.
- `data/links.json` is created automatically when the first link is added. It stores each destination, alias, creation time, and click count on the server, so links survive a restart.
- Opening a short URL such as `http://localhost:3000/summer-sale` looks up its alias, increments its click count, and redirects to its destination.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/links` | List links and their click counts |
| `POST` | `/api/links` | Create a short link with a JSON body such as `{"url":"https://example.com","alias":"example"}` |
| `DELETE` | `/api/links/:alias` | Delete a short link |
| `GET` | `/:alias` | Redirect to the destination and record a click |

Custom aliases are optional and must contain 3–24 letters, numbers, hyphens, or underscores. Destinations must be valid HTTP or HTTPS URLs. If no alias is supplied, the server generates one.

## Before public deployment

This is a lightweight, single-process app intended as a self-hosted starter. The JSON file is not a multi-process database, and the dashboard currently has no authentication; anyone who can reach the server can manage its links. Put it behind appropriate authentication and use a database and backups before sharing it with untrusted users or running multiple server instances.
