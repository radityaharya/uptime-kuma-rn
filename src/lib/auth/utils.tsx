import { getItem, removeItem, setItem } from '@/lib/storage';

const TOKEN = 'token';

export type AuthCredentials = {
  host: string;
  username: string;
  password: string;
};

export const getToken = () => getItem<AuthCredentials>(TOKEN);
export const removeToken = () => removeItem(TOKEN);
export const setToken = (value: AuthCredentials) => setItem<AuthCredentials>(TOKEN, value);
