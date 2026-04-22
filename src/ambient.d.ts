declare module 'sql.js' {
	interface Database {
		prepare(sql: string): Statement;
		close(): void;
	}
	interface Statement {
		bind(params?: unknown[]): boolean;
		step(): boolean;
		getAsObject(): Record<string, unknown>;
		free(): void;
	}
	interface SqlJsStatic {
		Database: new (data?: ArrayLike<number>) => Database;
	}
	type BindParams = unknown[];
	export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
	export type { Database, BindParams };
}
