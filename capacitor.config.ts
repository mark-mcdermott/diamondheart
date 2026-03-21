import type { CapacitorConfig } from '@capacitor/cli';

// Set to true for local development, false for production
const isDev = true;

const config: CapacitorConfig = {
	appId: 'com.ortholinear.tracker',
	appName: 'Ortholinear',
	webDir: 'build',
	server: isDev
		? { url: 'http://localhost:5173', cleartext: true }
		: { url: 'https://ortholinear.app' },
	ios: {
		contentInset: 'automatic'
	}
};

export default config;
