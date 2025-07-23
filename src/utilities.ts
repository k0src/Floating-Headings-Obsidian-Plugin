export class CacheManager<T> {
	private cache: Map<string, { data: T; timestamp: number }> = new Map();
	private maxSize: number;
	private ttl: number;

	constructor(maxSize: number = 10, ttl: number = 1000) {
		this.maxSize = maxSize;
		this.ttl = ttl;
	}

	set(key: string, data: T): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		});

		this.cleanOldEntries();
	}

	get(key: string): T | null {
		const cached = this.cache.get(key);
		if (!cached) return null;

		if (Date.now() - cached.timestamp > this.ttl) {
			this.cache.delete(key);
			return null;
		}

		return cached.data;
	}

	clear(): void {
		this.cache.clear();
	}

	private cleanOldEntries(): void {
		if (this.cache.size <= this.maxSize) return;

		const oldestKey = this.cache.keys().next().value;
		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	get size(): number {
		return this.cache.size;
	}
}

export class TimeoutManager {
	private timeouts: Map<string, number> = new Map();

	set(key: string, callback: () => void, delay: number): void {
		this.clear(key);
		const timeoutId = window.setTimeout(callback, delay);
		this.timeouts.set(key, timeoutId);
	}

	clear(key: string): void {
		const timeoutId = this.timeouts.get(key);
		if (timeoutId) {
			clearTimeout(timeoutId);
			this.timeouts.delete(key);
		}
	}

	clearAll(): void {
		this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
		this.timeouts.clear();
	}
}
