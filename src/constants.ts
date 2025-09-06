export const corsHeaders = (origin: string | null) => ({
	'Access-Control-Allow-Origin': origin || '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers':
		'Content-Type, x-ridgeline-key, x-ridgeline-user-ctx, x-ridgeline-sdk-ctx',
	'Access-Control-Allow-Credentials': 'true',
	Vary: 'Origin',
});
