import { json } from "@sveltejs/kit";

export async function POST({cookies}) {
    cookies.delete('AUTH_TOKEN');

    return json({}, {status: 201});
}