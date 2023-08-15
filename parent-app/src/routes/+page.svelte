<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
    import { get } from 'svelte/store';

	import welcome from '$lib/images/svelte-welcome.webp';
	import welcome_fallback from '$lib/images/svelte-welcome.png';

	import auth from '$lib/authService';
	import { isAuthenticated, user } from '$lib/store';
	import type { Auth0Client } from '@auth0/auth0-spa-js';

	let client: Auth0Client;

	onMount(async () => {
		client = await auth.createClient();
		if (await client.isAuthenticated()) {
			isAuthenticated.set(true);
			await auth.silentRefreshToken(client);
		}
	});

	async function login() {
		await auth.loginWithPopup(client, {});
	}

	async function logout() {
		await auth.logout(client);
	}

	enum MessageType {
		REQUEST_LOGIN,
		REQUEST_LOGOUT,
		SEND_USER
	}

	class Message {
		type: MessageType;
		value: string;

		constructor(type: MessageType, value: string) {
			this.type = type;
			this.value = value;
		}
	}

	function sendMessage() {
		if (browser && $isAuthenticated) {
			const user_data = get(user);
			console.log(user_data);
			const iframe = document.querySelector("iframe");
			if (iframe !== null) {
				const message = JSON.stringify(new Message(MessageType.SEND_USER, JSON.stringify(user_data)))
				console.log(`Sending message to child: ${message}`)
				iframe.contentWindow?.postMessage(message, "https://childapp.com:5173");
			}
		}
	}
	
	function receiveMessage(event: MessageEvent) {
		console.log(`Message recieved from ${event.origin}: ${event.data}`);
		if (event.origin.startsWith("https://childapp.com:5173")) {
			try {
				const message: Message = JSON.parse(event.data);
				console.log(`Parsed Message: ${message.type} ${message.value}`);
				switch (message.type) {
					case MessageType.REQUEST_LOGIN: {
						if ($isAuthenticated) {
							sendMessage();
						} else {
							login().then(sendMessage);
						}
						break;
					}
					case MessageType.REQUEST_LOGOUT: {
						logout();
						break;
					}
					default: {
						console.log(`Default Message: ${message.value}`);
						break;
					}
				}
			} catch (e) {
				console.error(e);
			}
		}
	}

	onMount(async () => {	
		if (browser) {
			window.addEventListener('message', receiveMessage)
		}
	})

	onDestroy(async () => {
		if (browser) {
			window.removeEventListener("message", receiveMessage);
		}
	})

</script>

<svelte:head>
	<title>Parent Site</title>
	<meta name="description" content="Svelte parent site" />
</svelte:head>

<section>
	<h1>
		<span class="welcome">
			<picture>
				<source srcset={welcome} type="image/webp" />
				<img src={welcome_fallback} alt="Welcome" />
			</picture>
		</span>

		ParentApp
	</h1>

	{#if $isAuthenticated}
		<h2>Username: {$user?.nickname}</h2>
		<h2>Email: {$user?.email}</h2>
		<button on:click={logout}>Logout</button>
	{:else}
		<h2>Not Logged In</h2>
		<button on:click={login}>Login</button>
	{/if}

	<iframe title="child" src="https://childapp.com:5173" style="width: 1280px; height: 700px;"></iframe>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
	}

	.welcome {
		display: block;
		position: relative;
		width: 100%;
		height: 0;
		padding: 0 0 calc(100% * 495 / 2048) 0;
	}

	.welcome img {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		display: block;
	}
</style>
