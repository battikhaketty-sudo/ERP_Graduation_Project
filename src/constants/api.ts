import { env } from "../config/env";

export const API_BASE_URL = env.apiBaseUrl;
export const API_HOST = env.apiHost;
export const API_DOCS_URL = `${env.apiHost}/scalar/`;
export const OPENAPI_URL = `${env.apiHost}/openapi/v1.json`;
