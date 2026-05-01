export const safeJsonParse = <T>(
	raw: string | null | undefined,
	fallback: T,
	onInvalid?: () => void
): T => {
	if (!raw || raw === 'undefined' || raw === 'null') {
		return fallback;
	}

	try {
		return JSON.parse(raw) as T;
	} catch {
		onInvalid?.();
		return fallback;
	}
};
