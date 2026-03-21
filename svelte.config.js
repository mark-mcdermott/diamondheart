import cloudflare from '@sveltejs/adapter-cloudflare';
import static_ from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: isTauri
			? static_({ pages: 'build', assets: 'build', fallback: 'index.html' })
			: cloudflare()
	}
};

export default config;
