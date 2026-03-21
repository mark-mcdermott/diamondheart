import cloudflare from '@sveltejs/adapter-cloudflare';
import static_ from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isNative = process.env.TAURI_ENV_PLATFORM !== undefined || process.env.CAPACITOR === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: isNative
			? static_({ pages: 'build', assets: 'build', fallback: 'index.html' })
			: cloudflare()
	}
};

export default config;
