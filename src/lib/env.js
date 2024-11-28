import Constants from 'expo-constants';
/**
 *  @type {typeof import('../../env.js').ClientEnv}
 */
//@ts-ignore //`.
export const Env = Constants.expoConfig?.extra ?? {};
