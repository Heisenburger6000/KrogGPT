# krog-gpt

A static GitHub Pages chatbot frontend with a Cloudflare Worker backend that securely calls the OpenAI Responses API.

## Project layout

- `index.html`, `style.css`, `app.js`, `config.js` — GitHub Pages website
- `worker/index.js`, `worker/wrangler.toml` — API backend

**Never put your OpenAI API key in `config.js`, GitHub, or any browser code.** The key belongs in a Cloudflare Worker secret.

## 1. Create an OpenAI API key

1. Sign in at https://platform.openai.com/
2. Create an API key in your API settings.
3. Make sure API billing/credits are configured for your project.
4. Keep the key private. Do not paste it into any file in this repository.

ChatGPT subscriptions and API billing are separate.

## 2. Deploy the Cloudflare Worker

1. Create/sign in to a Cloudflare account: https://dash.cloudflare.com/
2. Open **Workers & Pages** and create a Worker, or use the Wrangler CLI.
3. Easiest CLI route: install Node.js, then in a terminal:

   ```bash
   cd worker
   npx wrangler login
   ```

4. Edit `worker/wrangler.toml`. Change `ALLOWED_ORIGIN` to the origin of your GitHub Pages site:
   - User/organization site: `https://YOUR-GITHUB-USERNAME.github.io`
   - Project site: still `https://YOUR-GITHUB-USERNAME.github.io` (the repository path is not part of the origin)
   - Custom domain: `https://www.your-domain.example`

   Do not add a trailing slash or repository path.

5. Set your API key as an encrypted Worker secret:

   ```bash
   npx wrangler secret put OPENAI_API_KEY
   ```

   Paste the key when prompted. Do not put it in `wrangler.toml`.

6. Deploy:

   ```bash
   npx wrangler deploy
   ```

7. Copy the deployed Worker URL. It will look similar to:
   `https://krog-gpt-api.YOUR-SUBDOMAIN.workers.dev`

You can change `OPENAI_MODEL` in `wrangler.toml` to another model available to your OpenAI API project, then deploy again.

## 3. Connect the website to the Worker

Open the root `config.js` and replace:

```js
apiUrl: "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE"
```

with your real Worker URL, for example:

```js
apiUrl: "https://krog-gpt-api.YOUR-SUBDOMAIN.workers.dev"
```

This URL is public and is not a secret. The OpenAI key remains on Cloudflare.

## 4. Publish on GitHub Pages

1. Create a GitHub repository, for example `krog-gpt`.
2. Upload the **root-level** files from this project: `index.html`, `style.css`, `app.js`, and `config.js`. You can also upload the `worker` folder and README.
3. In the repository, open **Settings → Pages**.
4. Under Build and deployment, choose **Deploy from a branch**.
5. Choose your branch (usually `main`) and folder `/ (root)`, then Save.
6. Wait for GitHub Pages to publish, then open the site.

If you use a custom domain, update `ALLOWED_ORIGIN` to that domain's exact HTTPS origin and redeploy the Worker.

## 5. Test it

Open your GitHub Pages site and send a message. If it fails:

- **“website is not allowed”**: `ALLOWED_ORIGIN` does not exactly match the website origin. Fix it and redeploy.
- **“API key has not been configured”**: add the `OPENAI_API_KEY` Worker secret.
- **429 / usage limit**: check API billing, project limits, and rate limits.
- **Worker URL error**: confirm `config.js` contains the deployed Worker URL.

## Important before sharing publicly

The Worker checks the browser Origin and limits message size/history, but CORS is not authentication: someone can call a public Worker outside a browser and incur API usage. Before sharing the site widely, add Cloudflare Turnstile or another abuse-prevention/rate-limiting layer, and set sensible usage limits/budget alerts in your OpenAI project. Never rely on a hidden frontend URL as security.

## Features

- Responsive orange-and-black chat interface
- OpenAI Responses API called only from the backend
- API key stored as a Cloudflare secret
- Conversation context for the latest 20 messages
- New chat button and suggestion prompts
- Clear error messages and basic input validation
