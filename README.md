# SOM Network Navigator

This Next.js + TypeScript application (deployed on Vercel) helps Yale SOM students and alumni find their next role by surfacing relevant alumni profiles, networking paths, and targeted outreach recommendations powered by OpenAI embeddings and Pinecone vectors.

## Prerequisites

- [Node.js](https://nodejs.org/) 20.x LTS or newer
- npm (comes bundled with Node) or another compatible package manager

## Installation & Dependencies

Install the project dependencies from the repository root:

```bash
npm install
```

## Environment Configuration

Copy `.env.local` from a template (create the file if it does not exist) and populate it with the keys listed below. Never commit secrets to version control.

```bash
cp .env.local.example .env.local  # create a local file if you have a template
```

### Required environment variables

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI API key used by embeddings, chat completions, and the streaming assistant. |
| `PINECONE_API_KEY` | Pinecone API key for accessing the configured vector index. |
| `PINECONE_INDEX` | The name of the Pinecone index storing alum profile vectors. |
| `PINECONE_NAMESPACE` | Namespace used by the cleanup scripts (`delete:pinecone:all`). |
| `EXA_API_KEY` | Exa API key used by People Finder (LinkedIn profile discovery). |
| `NEXT_PUBLIC_SEGMENT_WRITE_KEY` | Segment write key for client-side analytics instrumentation. |

If you use Clerk or other providers, add their keys as needed. Vercel resolves `.env.local` for preview/deploy environments, so mirror the same keys in the project settings.

## Running the Application

- Development server (hot reload on `http://localhost:3000`):

  ```bash
  npm run dev
  ```

- Production build:

  ```bash
  npm run build
  ```

- Start the production build locally:

  ```bash
  npm run start
  ```

Vercel automatically runs `npm run build` before deploying; ensure your `.env` keys are set in the project dashboard.

## Reproducing Results

1. Start the dev server with `npm run dev`.
2. Open `http://localhost:3000` and authenticate if prompted (Clerk manages auth).
3. Open the workspace and describe who you want to meet; the system queries Pinecone (and falls back to EXA when needed) to gather alum profiles, then helps draft/refine outreach.
4. Confirm the console logs mention vector retrieval and optionally run `npm run lint` or the ingest/delete scripts (`npm run ingest:pinecone`) to validate data pipeline scripts.

If you’re validating deployment, trigger a preview on Vercel and repeat the workspace flow to ensure the `OPENAI_API_KEY` and Pinecone keys work in that environment as well.
