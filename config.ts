// Safe access to environment variables for Vite
const getEnv = (key: string, defaultValue: string): string => {
  // For Vite, we use import.meta.env instead of process.env
  return (import.meta.env?.[key] as string) || defaultValue;
};

export const config = {
	apiUrl: getEnv('VITE_API_URL', 'http://localhost:3000/api'),
}