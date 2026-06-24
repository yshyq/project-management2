import { defineStore } from "pinia";
import { api } from "../api";
import { getToken, setToken } from "../api/client";
import type { Profile } from "../api/types";

interface AuthState {
  profile: Profile | null;
  menus: string[];
  ready: boolean;
  loading: boolean;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    profile: null,
    menus: [],
    ready: false,
    loading: false
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.profile && getToken()),
    displayName: (state) => state.profile?.name || state.profile?.username || "",
    credentialPolicy: (state) => state.profile?.credentialPolicy || "申请查看"
  },
  actions: {
    canSee(menuKey: string) {
      return this.menus.includes(menuKey);
    },
    async login(username: string, password: string) {
      this.loading = true;
      try {
        const result = await api.login({ username, password });
        setToken(result.accessToken);
        this.profile = result.profile;
        this.menus = result.profile.menus;
        this.ready = true;
      } finally {
        this.loading = false;
      }
    },
    async bootstrap() {
      if (!getToken()) {
        this.ready = true;
        return;
      }
      try {
        const [profile, menus] = await Promise.all([api.profile(), api.menus()]);
        this.profile = profile;
        this.menus = menus;
      } catch {
        setToken("");
        this.profile = null;
        this.menus = [];
      } finally {
        this.ready = true;
      }
    },
    logout() {
      setToken("");
      this.profile = null;
      this.menus = [];
      this.ready = true;
    }
  }
});
