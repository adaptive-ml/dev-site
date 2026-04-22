import initSqlJs, { type Database, type BindParams } from 'sql.js';
import { base } from '$app/paths';

let dbPromise: Promise<Database> | undefined;

export function loadDb(): Promise<Database> {
	if (!dbPromise) {
		dbPromise = (async () => {
			const [SQL, buf] = await Promise.all([
				initSqlJs({ locateFile: () => 'https://sql.js.org/dist/sql-wasm.wasm' }),
				fetch(`${base}/results.db`).then((r) => r.arrayBuffer()),
			]);
			return new SQL.Database(new Uint8Array(buf));
		})();
	}
	return dbPromise;
}

export async function query(sql: string, params: BindParams = []): Promise<Record<string, unknown>[]> {
	const db = await loadDb();
	const stmt = db.prepare(sql);
	stmt.bind(params);
	const rows: Record<string, unknown>[] = [];
	while (stmt.step()) rows.push(stmt.getAsObject());
	stmt.free();
	return rows;
}

export interface ColorResult {
	hex: string;
	names: Record<string, string>;
}

export async function getRandomColor(models: string[] = ['base']): Promise<ColorResult> {
	const row = (await query('SELECT DISTINCT hex FROM completions ORDER BY RANDOM() LIMIT 1'))[0];
	const hex = row.hex as string;
	return getColor(hex, models);
}

export async function getColor(hex: string, models: string[] = ['base']): Promise<ColorResult> {
	const placeholders = models.map(() => '?').join(',');
	const rows = await query(
		`SELECT model, name FROM completions WHERE hex = ? AND model IN (${placeholders})`,
		[hex, ...models],
	);
	const names: Record<string, string> = {};
	for (const r of rows) names[r.model as string] = r.name as string;
	return { hex, names };
}

export async function getAllHexes(): Promise<string[]> {
	const rows = await query('SELECT DISTINCT hex FROM completions ORDER BY hex');
	return rows.map((r) => r.hex as string);
}
