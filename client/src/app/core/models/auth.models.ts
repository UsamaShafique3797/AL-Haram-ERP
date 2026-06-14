export interface LoginRequest {
  userName: string;
  password: string;
}

export interface UserDto {
  id: string;
  userName: string;
  fullName: string;
  email?: string | null;
  roles: string[];
}

export interface AuthResult {
  token: string;
  expiresAt: string;
  user: UserDto;
}

export interface CreateUserRequest {
  userName: string;
  fullName: string;
  email?: string | null;
  password: string;
  roles: string[];
}
