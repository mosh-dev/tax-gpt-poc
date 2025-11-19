/**
 * Authentication Service
 * Handles token management, login, logout, and auto-refresh
 */

import { API_BASE_URL } from './api';

const ACCESS_TOKEN_KEY = 'tax_gpt_access_token';
const REFRESH_TOKEN_KEY = 'tax_gpt_refresh_token';
const USER_KEY = 'tax_gpt_user';

export interface User {
  userId: string;
  name: string;
  userName: string;
}

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  private refreshPromise: Promise<boolean> | null = null;

  /**
   * Get access token from storage
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Get refresh token from storage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Get current user from storage
   */
  getUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Store tokens and user info
   */
  private setTokens(accessToken: string, refreshToken: string, user?: User): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * Clear all auth data
   */
  private clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Login with username and password
   */
  async login(userName: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userName, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    this.setTokens(data.accessToken, data.refreshToken, data.user);
    return data.user;
  }

  /**
   * Logout and clear tokens
   */
  logout(): void {
    this.clearTokens();
  }

  /**
   * Refresh access token using refresh token
   * Returns true if refresh succeeded, false otherwise
   */
  async refreshAccessToken(): Promise<boolean> {
    // If already refreshing, wait for that to complete
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    this.refreshPromise = this.doRefresh(refreshToken);

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(refreshToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data: RefreshResponse = await response.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  /**
   * Fetch with automatic token refresh
   * If request fails with 401 and TOKEN_EXPIRED, tries to refresh and retry
   */
  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = this.getAccessToken();

    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If unauthorized and token expired, try to refresh
    if (response.status === 401) {
      const data = await response.clone().json().catch(() => ({}));

      if (data.code === 'TOKEN_EXPIRED') {
        const refreshed = await this.refreshAccessToken();

        if (refreshed) {
          // Retry with new token
          const newToken = this.getAccessToken();
          headers.set('Authorization', `Bearer ${newToken}`);

          return fetch(url, {
            ...options,
            headers,
          });
        }
      }
    }

    return response;
  }
}

export const authService = new AuthService();
