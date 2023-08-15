import type { User } from "@auth0/auth0-spa-js";
import { writable, type Writable } from "svelte/store";

export const isAuthenticated = writable(false);
export const user: Writable<User> = writable({});
export const popupOpen = writable(false);
export const error = writable();