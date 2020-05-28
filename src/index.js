#!/usr/bin/env node

const fs = require('fs-extra')
const { join } = require('path')
const system = require('system-commands')
const chalk = require('chalk')

let [name, id] = require('yargs').argv._

const mkdir = path =>
	fs.mkdir(`${name}/${path}`)

const writeFile = (path, data) =>
	fs.writeFile(`${name}/${path}`, `${data}\n`)

const json = object =>
	JSON.stringify(object, null, '\t')

const makeRoot = async () => {
	console.log(chalk`{yellow.bold [WAITING]} {yellow Making root files...}`)
	
	await Promise.all([
		// package.json
		writeFile('package.json', json({
			name,
			scripts: {
				clean: 'rm -rf public/out functions/.next',
				predeploy: 'npm run clean && npm run build -C public',
				deploy: 'firebase deploy',
				postdeploy: 'npm run clean',
				start: 'npm run dev -C public'
			},
			private: true
		})),
		
		// firestore.indexes.json
		writeFile('firestore.indexes.json', json({
			indexes: [],
			fieldOverrides: []
		})),
		
		// firebase.json
		writeFile('firebase.json', json({
			firestore: {
				rules: 'rules/firestore.rules',
				indexes: 'firestore.indexes.json'
			},
			storage: {
				rules: 'rules/storage.rules'
			},
			functions: {
				predeploy: ['npm run build -C "$RESOURCE_DIR"']
			},
			hosting: {
				public: 'public/out',
				ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
				rewrites: [
					{
						source: '**',
						function: 'app'
					}
				]
			}
		})),
		
		// .gitignore
		writeFile('.gitignore', [
			'**/*.DS_Store',
			'.firebase/',
			'*.log'
		].join('\n')),
		
		// .firebaserc
		writeFile('.firebaserc', json({
			projects: {
				default: id
			}
		})),
		
		// README.md
		writeFile(
			'README.md',
			`# ${name}

> Scaffolded by [next-firebase](https://www.npmjs.com/package/next-firebase)

## Run dev server

\`\`\`bash
npm start
\`\`\`

## Deploy

\`\`\`bash
npm run deploy
\`\`\``)
	])
	
	console.log(chalk`{green.bold [SUCCESS] Made root files}`)
}

const makeFunctions = async () => {
	console.log(chalk`{yellow.bold [WAITING]} {yellow Making functions directory...}`)
	
	await mkdir('functions')
	await mkdir('functions/src')
	
	await Promise.all([
		// src/index.ts
		writeFile(
			'functions/src/index.ts',
			`import { initializeApp } from 'firebase-admin'

initializeApp({
	storageBucket: '${id}.appspot.com'
})

export { default as app } from './app'`),
		
		// src/app.ts
		writeFile(
			'functions/src/app.ts',
			`import * as functions from 'firebase-functions'
import next from 'next'
import { join, relative } from 'path'

const app = next({
	conf: {
		distDir: join(
			relative(process.cwd(), __dirname),
			'../.next'
		)
	}
})
const handleRequest = app.getRequestHandler()

let shouldPrepare = true

export default functions.https.onRequest(async (req, res) => {
	if (shouldPrepare) {
		shouldPrepare = false
		await app.prepare()
	}
	
	await handleRequest(req, res)
})`),
		
		// .gitignore
		writeFile('functions/.gitignore', [
			'**/*.DS_Store',
			'node_modules/',
			'lib/',
			'.next/'
		].join('\n')),
		
		// package.json
		writeFile('functions/package.json', json({
			name: 'functions',
			main: 'lib/index.js',
			scripts: {
				lint: 'tslint --project tsconfig.json',
				build: 'tsc',
				serve: 'npm run build && firebase emulators:start --only functions',
				shell: 'npm run build && firebase functions:shell',
				start: 'npm run shell',
				deploy: 'firebase deploy --only functions',
				logs: 'firebase functions:log'
			},
			engines: {
				node: '10'
			},
			dependencies: {},
			devDependencies: {},
			private: true
		})),
		
		// tsconfig.json
		writeFile('functions/tsconfig.json', json({
			compilerOptions: {
				module: 'commonjs',
				noImplicitReturns: true,
				noUnusedLocals: true,
				outDir: 'lib',
				sourceMap: true,
				strict: true,
				target: 'es2017',
				skipLibCheck: true,
				incremental: true,
				baseUrl: 'src'
			},
			compileOnSave: true,
			include: ['src']
		}))
	])
	
	console.log(chalk`{green.bold [SUCCESS] Made functions directory}`)
	console.log(chalk`{yellow.bold [WAITING]} {yellow Installing dependencies for functions (this might take some time)...}`)
	
	await system(`npm i firebase-admin firebase-functions next react react-dom -C ${name}/functions`)
	await system(`npm i -D typescript -C ${name}/functions`)
	
	console.log(chalk`{green.bold [SUCCESS] Installed dependencies for functions}`)
}

const makePublic = async () => {
	console.log(chalk`{yellow.bold [WAITING]} {yellow Making public directory...}`)
	
	await mkdir('public')
	
	await Promise.all([
		mkdir('public/public'),
		mkdir('public/pages'),
		mkdir('public/styles')
	])
	
	await Promise.all([
		// public/favicon.ico
		system(`cp ${join(__dirname, '../assets/favicon.ico')} ${name}/public/public`),
		
		writeFile(
			'public/pages/_app.tsx',
			`import { AppProps } from 'next/app'

import 'styles/global.scss'

export default ({ Component, pageProps }: AppProps) => (
	<Component {...pageProps} />
)`),
		
		// pages/index.tsx
		writeFile(
			'public/pages/index.tsx',
			`import Head from 'next/head'

import styles from 'styles/index.module.scss'

export default () => (
	<>
		<Head>
			<title>Next.js</title>
		</Head>
		<div className={styles.root}>
			<h1>If you see this, your Next.js app is working!</h1>
		</div>
	</>
)`),
		
		// styles/global.scss
		writeFile(
			'public/styles/global.scss',
			`*,
::before,
::after {
	box-sizing: border-box;
}

body {
	margin: 0;
}`),
		
		// styles/index.module.scss
		writeFile(
			'public/styles/index.module.scss',
			`.root {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100vh;
	text-align: center;
	font-family: Arial, Helvetica, sans-serif;
}`),
		
		// next-env.d.ts
		writeFile(
			'public/next-env.d.ts',
			`/// <reference types="next" />
/// <reference types="next/types/global" />`),
		
		// .gitignore
		writeFile('public/.gitignore', [
			'**/*.DS_Store',
			'node_modules/',
			'.next/',
			'out/'
		].join('\n')),
		
		// package.json
		writeFile('public/package.json', json({
			name: 'public',
			version: '1.0.0',
			scripts: {
				dev: 'next dev',
				build: 'next build && next export && mv .next ../functions',
				start: 'next start'
			},
			dependencies: {},
			devDependencies: {},
			private: true
		})),
		
		// tsconfig.json
		writeFile('public/tsconfig.json', json({
			compilerOptions: {
				target: 'es5',
				lib: ['dom', 'dom.iterable', 'esnext'],
				allowJs: true,
				skipLibCheck: true,
				strict: false,
				forceConsistentCasingInFileNames: true,
				noEmit: true,
				esModuleInterop: true,
				module: 'esnext',
				moduleResolution: 'node',
				resolveJsonModule: true,
				isolatedModules: true,
				jsx: 'preserve',
				baseUrl: '.'
			},
			exclude: ['node_modules'],
			include: ['next-env.d.ts', '**/*.ts', '**/*.tsx']
		}))
	])
	
	console.log(chalk`{green.bold [SUCCESS] Made public directory}`)
	console.log(chalk`{yellow.bold [WAITING]} {yellow Installing dependencies for public (this might take some time)...}`)
	
	await system(`npm i next react react-dom sass -C ${name}/public`)
	await system(`npm i -D typescript @types/react @types/node -C ${name}/public`)
	
	console.log(chalk`{green.bold [SUCCESS] Installed dependencies for public}`)
}

const makeRules = async () => {
	console.log(chalk`{yellow.bold [WAITING]} {yellow Making Firebase rules directory...}`)
	
	await mkdir('rules')
	
	await Promise.all([
		// firestore.rules
		writeFile(
			'rules/firestore.rules',
			`rules_version = '2'

service cloud.firestore {
	match /databases/{database}/documents {
		match /{document=**} {
			allow read, write
		}
	}
}`),
		
		// storage.rules
		writeFile(
			'rules/storage.rules',
			`rules_version = '2'

service firebase.storage {
	match /b/{bucket}/o {
		match /{allPaths=**} {
			allow read, write
		}
	}
}`)
	])
	
	console.log(chalk`{green.bold [SUCCESS] Made Firebase rules directory}`)
}

if (require.main === module)
	(async () => {
		try {
			if (!(typeof name === 'string' && typeof id === 'string'))
				return console.log(chalk`{red.bold npx next-firebase [project_name] [project_id]}`)
			
			name = name.replace(/\s+/g, '-').toLowerCase()
			
			console.log(chalk`\n{cyan.bold [START]} {cyan Creating your Next.js app in} {cyan.bold ${join(process.cwd(), name)}}\n`)
			
			await fs.mkdir(name)
			
			await Promise.all([
				makeRoot(),
				makeFunctions(),
				makePublic(),
				makeRules()
			])
			
			console.log(chalk`\n{cyan.bold [END]} {cyan All done! cd into ${name} and run the dev server with "npm start".}\n`)
		} catch (error) {
			console.error(chalk`\n{red.bold [ERROR]} {red An error occurred:} {red.bold ${error.message}}\n`)
		}
	})()
