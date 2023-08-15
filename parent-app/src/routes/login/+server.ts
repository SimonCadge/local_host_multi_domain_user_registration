import { json } from "@sveltejs/kit";

export async function POST({cookies, request}) {
    const { retrieved_token } = await request.json();

    cookies.set('AUTH_TOKEN', retrieved_token.access_token, {path: "/"});

    return json({}, {status: 201});
}