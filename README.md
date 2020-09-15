# next-firebase

> Quickly scaffold a Next.js + Firebase app

In order to serve dynamic Next.js apps on Firebase, this includes a custom deploy script that integrates with Firebase Hosting & Firebase Functions.

## Create a project

### With Server Side Rendering

```bash
npx next-firebase [project_name] [project_id]
```

### Without Server Side Rendering (only static)

```bash
npx next-firebase [project_name] [project_id] --static
```

## Example

```bash
npx next-firebase my-app my-app-72e8yG
```

## Dev server

```bash
npm start
```

## Deploy

```bash
npm run deploy
```
