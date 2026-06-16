export type AuthUser = {
  email: string;
  name: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResult = {
  token: string;
  user: AuthUser;
};
