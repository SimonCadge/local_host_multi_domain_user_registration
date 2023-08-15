import { Auth0Client, createAuth0Client, type PopupLoginOptions } from "@auth0/auth0-spa-js";
import { env } from '$env/dynamic/public';
import { isAuthenticated, popupOpen, user } from "./store";

let timeout: string | number | NodeJS.Timeout | null | undefined = null;

async function createClient() {
    const domain = env.PUBLIC_AUTH0_DOMAIN;
    const client_id = env.PUBLIC_AUTH0_CLIENT_ID;
    if (domain === undefined || client_id === undefined) {
        throw new Error("Auth0 domain and client ID need to be configured in env variables");
    }

    let auth0Client = await createAuth0Client({
        domain: domain,
        clientId: client_id,
        useRefreshTokens: true,
        cacheLocation: 'localstorage',
        authorizationParams: {
            audience: 'https://parentapp:5173'
        }
    });

    return auth0Client;
}

async function loginWithPopup(client: Auth0Client, options: PopupLoginOptions) {
    popupOpen.set(true);
    try {
        await client.loginWithPopup(options);
        isAuthenticated.set(true);
        await silentRefreshToken(client);
    } catch (e) {
        console.error(e);
    } finally {
        popupOpen.set(false);
    }
}

async function silentRefreshToken(client: Auth0Client) {
    const retrieved_token = await client.getTokenSilently({
        authorizationParams: {
            audience: 'https://parentapp:5173'
        },
        detailedResponse: true
    });
    await fetch('./login', {
        method: "POST",
        body: JSON.stringify({retrieved_token}),
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const retrieved_user = await client.getUser();
    if (retrieved_user === undefined) {
        throw new Error("Couldn't get user details");
    }
    user.set(retrieved_user);
    timeout = setTimeout(() => silentRefreshToken(client), (retrieved_token.expires_in * 1000));
}

async function logout(client: Auth0Client) {
    return client.logout({ openUrl(url) {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        isAuthenticated.set(false);
        user.set({});
        fetch('/logout', {
            method: "POST",
            body: null
        });
    }})
}

const auth = {
    createClient,
    loginWithPopup,
    silentRefreshToken,
    logout
}

export default auth;