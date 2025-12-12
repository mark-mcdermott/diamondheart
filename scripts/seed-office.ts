import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { generateId } from 'lucia';
import { users } from '../src/lib/server/db/schema';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// The Office characters - all passwords are "dundermifflin"
// Hash generated with PBKDF2 (same as auth module uses)
const passwordHash = 'pbkdf2:100000:dGVzdHNhbHQxMjM0NQ==:8K+HkFqJzLxL5Kk5mL5nFQ==';

const officeCharacters = [
	{ name: 'Michael Scott', email: 'michael.scott@dundermifflin.com' },
	{ name: 'Dwight Schrute', email: 'dwight.schrute@dundermifflin.com' },
	{ name: 'Jim Halpert', email: 'jim.halpert@dundermifflin.com' },
	{ name: 'Pam Beesly', email: 'pam.beesly@dundermifflin.com' },
	{ name: 'Ryan Howard', email: 'ryan.howard@dundermifflin.com' },
	{ name: 'Andy Bernard', email: 'andy.bernard@dundermifflin.com' },
	{ name: 'Angela Martin', email: 'angela.martin@dundermifflin.com' },
	{ name: 'Kevin Malone', email: 'kevin.malone@dundermifflin.com' },
	{ name: 'Oscar Martinez', email: 'oscar.martinez@dundermifflin.com' },
	{ name: 'Stanley Hudson', email: 'stanley.hudson@dundermifflin.com' },
	{ name: 'Phyllis Vance', email: 'phyllis.vance@dundermifflin.com' },
	{ name: 'Meredith Palmer', email: 'meredith.palmer@dundermifflin.com' },
	{ name: 'Creed Bratton', email: 'creed.bratton@dundermifflin.com' },
	{ name: 'Kelly Kapoor', email: 'kelly.kapoor@dundermifflin.com' },
	{ name: 'Toby Flenderson', email: 'toby.flenderson@dundermifflin.com' },
	{ name: 'Darryl Philbin', email: 'darryl.philbin@dundermifflin.com' },
	{ name: 'Erin Hannon', email: 'erin.hannon@dundermifflin.com' },
	{ name: 'Gabe Lewis', email: 'gabe.lewis@dundermifflin.com' },
	{ name: 'Holly Flax', email: 'holly.flax@dundermifflin.com' },
	{ name: 'Jan Levinson', email: 'jan.levinson@dundermifflin.com' }
];

async function seed() {
	console.log('Seeding The Office characters...');
	console.log('Password for all users: dundermifflin');
	console.log('');

	for (const character of officeCharacters) {
		const id = generateId(15);
		await db.insert(users).values({
			id,
			email: character.email,
			passwordHash,
			name: character.name
		}).onConflictDoNothing();
		console.log(`Created user: ${character.name} (${character.email})`);
	}

	console.log('');
	console.log('Done! You can now login as any character.');
	console.log('Example: michael.scott@dundermifflin.com / dundermifflin');
}

seed().catch(console.error);
