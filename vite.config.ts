import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// @ts-expect-error - plugin type mismatch between vite and vitest/config
	plugins: [tailwindcss(), sveltekit()],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
