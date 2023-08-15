<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	import welcome from '$lib/images/svelte-welcome.webp';
	import welcome_fallback from '$lib/images/svelte-welcome.png';
    import type { User } from '@auth0/auth0-spa-js';

	enum MessageType {
		REQUEST_LOGIN,
		REQUEST_LOGOUT,
		SEND_USER
	}

	class Message {
		type: MessageType;
		value: string

		constructor(type: MessageType, value: string) {
			this.type = type;
			this.value = value;
		}
	}

	let user: User | null = null;

	function login() {
		if (browser) {
			console.log(`Requesting User Details from Parent`)
			window.parent.postMessage(JSON.stringify(new Message(MessageType.REQUEST_LOGIN, "")), "https://parentapp.com:5173");
		}
	}

	function logout() {
		if (browser) {
			console.log(`Requesting Parent to Logout`)
			window.parent.postMessage(JSON.stringify(new Message(MessageType.REQUEST_LOGOUT, "")), "https://parentapp.com:5173");
			user = null;
		}
	}

	function receiveMessage(event: MessageEvent) {
		console.log(`Message recieved from ${event.origin}: ${event.data}`);
		if (event.origin.startsWith("https://parentapp.com:5173")) {
			try {
				const message: Message = JSON.parse(event.data);
				console.log(`Parsed Message: ${message.type} ${message.value}`);
				switch (message.type) {
					case MessageType.SEND_USER: {
						user = JSON.parse(message.value);
						console.log(`Got User: ${user}`);
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
			window.addEventListener('message', receiveMessage);
		}
	})

	onDestroy(async () => {
		if (browser) {
			window.removeEventListener("message", receiveMessage);
		}
	})

</script>

<svelte:head>
	<title>Child Site</title>
	<meta name="description" content="Svelte child site" />
</svelte:head>

<section>
	<h1>
		<span class="welcome">
			<picture>
				<source srcset={welcome} type="image/webp" />
				<img src={welcome_fallback} alt="Welcome" />
			</picture>
		</span>

		ChildApp
	</h1>
	
	{#if user !== null}
		<h2>Username: {user?.nickname}</h2>
		<h2>Email: {user?.email}</h2>
		<button on:click={logout}>Request Logout</button>
	{:else}
		<h2>Not Logged In</h2>
		<button on:click={login}>Request Login</button>
	{/if}
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
