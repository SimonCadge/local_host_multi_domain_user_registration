# User Registration Architecture Research
Documentation and dummy implementation of proposed User Registration Flow.
## Problem
The parent page hosts a game within an iframe.  
The child page needs to be able to call for user registration, and when the auth flow is completed the user should be authenticated in both the parent and child page.
## Proposed Architecture
### [window.postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
I propose that we use the `window.postMessage()` method to communicate the registration request between the child and parent pages.  
We start by defining a set of possible message types, and define message handlers for each message type in both the parent app and the child app.  
The child app can send a `REQUEST_LOGIN` message to the parent. The parent can handle the auth flow in whatever way we deem best and then send a `SEND_USER` message back to the child, which includes a payload of the user data (e.g. username, email).  
There are a few main strengths of this architecture:  
1. Security:
    - The child app doesn't take any responsibility for authorisation, so there is no need to distribute sensitive data (either in infrastructure e.g. secret keys, or at runtime e.g. passwords).
    - No data in flight. Messages sent by postMessage are communicated directly between the Window objects in the browser, rather than travelling over http or any other such protocol, so there is no chance of them being intercepted.
2. Single responsility principle:
    - The complexity of authorisation is all focussed in a single place. Users implementing the child app don't need to take on any of the complexity.
    - Easy to write unit and integration tests.
3. Adoption/Maturity:
    - postMessage is a mature and idiomatic approach to solving exactly this problem.
    - There are many examples of postMessage being used in cryptographically secure usecases.
    - Best practices are well understood and easy to follow.  
4. Flexibility:
    - If we're not currently in an iframe and we send a message to window.parent.postMessage() it is simply sent to our own window. Therefore, we wouldn't need to change the code whatsoever if we were hosting a game directly on the page vs inside of an iframe, in both cases we could call window.parent.postMessage() to send messages and define message listeners to receive them.

[Security Concerns](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns):  
As is described in the mozilla docs, there is only one security concern and it is easily handled. When we register a message listener it will receive every message that is sent to the Window, and if we aren't careful with checking the origin and source of the messages we could process a message from a bad actor (e.g. a malicious extension) which could lead to cross site scripting.  
Thankfully we won't be sending any sensitive data in my proposed architecture, so the worst thing a malicious actor could do would be a d.o.s attack by sending many login and logout requests, or send a really long email address which would look strange in the in-game UI, but we need not worry about that because there are tools in place to mitigate this:
 - When sending a message we can specify the `targetOrigin`, meaning that the message will only be sent if the origin of the Window is actually the page we want to send it to.
 - When retrieving a message we can check the `origin` property of the event against known-good origins, and discard any other messages.  

Following these two rules there is no chance of a bad actor either receiving or sending messages, and therefore we know the system is completely secure.

### Further Architecture
Obviously, `postMessage` is a very versatile method, and it is only one part of the complete end to end flow. We could define as many or as few message types as we like. We also need to implement the actual authorisation flow, though the authorisation itself isn't part of this research project.  
For my test project I have opted for a very small set of messages, and I have used the Single Page Application Auth0 library to connect to Auth0, which deals with user authorisation and registration for me.  
There are many Authorisation providers which support JWT tokens. I would definitely suggest using one, since security is of utmost importance and when striving for security it is always best to use mature tools with good adoption and support, but we would not necessarily need to use Auth0. I haven't looked into the prices or pros and cons of different providers.  
Messages:  
| Message Type   | Usage                                                                                                                                                                                                                                                                           | Payload                          |
|----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------|
| REQUEST_LOGIN  | Used by the child to request login details from the parent.<br>If the user is already logged in the parent just immediately sends the SEND_USER message.<br>If not, the parent initiates the auth flow (registration or login) and then sends the SEND_USER message when ready. | None                             |
| REQUEST_LOGOUT | Used to request that the user be logged out.<br>Could be implemented by either the parent or the child, or both.                                                                                                                                                                | None                             |
| SEND_USER      | Used to send the user payload from the parent to the child.<br>The user payload doesn't include any sensitive data.                                                                                                                                                             | User Data (e.g. username, email) |

## Test App
To ensure that this works, and to better demonstrate my approach, I have created this test implementation.  
Unfortunately, since I use Auth0 which is an external service, you won't be able to run the test app with a single line of code.  
I will describe how I configured Auth0 in such a way that you should be able to follow along, but I will also attach a video demonstration of the project to show what it looks like. Combining the video demonstration with looking through the code should be sufficient to understand how it works.
### Test App Architecture
I have two seperate [svelte](https://kit.svelte.dev/) apps, one called parent and one called child.  
The parent app listens on `127.0.0.10:5173` (configured in vite.config.ts), and the child on `127.0.0.11:5173`.  
I have added these two IP addresses to my hosts file (as described in the proxy-settings folder), so that the two websites appear to be hosted on `parentapp.com:5173` and `childapp.com:5173` respectively. This mimics how in production the site in the iframe would be running in a different domain.  
The child app is run using `npm run dev`.  
The parent app is run the same way, but before it can be run we need to export the `PUBLIC_AUTH0_DOMAIN` and `PUBLIC_AUTH0_CLIENT_ID` environment variables, as described in the readme file.  
The parent app uses the Auth0 [Single Page App SDK](https://auth0.com/docs/libraries/auth0-single-page-app-sdk) to communicate with Auth0. It also uses a few idiomatic features of Svelte (e.g. store, server routes) to handle the session and refresh the access-token periodically.  
The parent listens for REQUEST_LOGIN and REQUEST_LOGOUT messages from the child.  
On REQUEST_LOGIN, it will prompt the user to login if necessary, and will then send the user details to the child using the SEND_USER message.  
On REQUEST_LOGOUT, it will call the logout function in the Auth0 sdk.  
The child listens for SEND_USER messages from the parent. When it receives one it sets the local user variable.  
When the login button is pressed in the child, it sends the REQUEST_LOGIN message.  
When the logout button is pressed in the child, it sends the REQUEST_LOGOUT message and also sets the local user variable to null.  
### Auth0 Config
With this very simple test app, I have essentially just got the default Auth0 Single Page App config.  
In the Applications section, I pressed `+ Create Application` and created a Single Page Application called `multi-domain-test`.  
The only thing I have changed is to add the URL `https://parentapp.com:5173` to the Allowed Callback URLs, Allowed Logout URLs, Allowed Web Origins and Allowed Origins (CORS).  
Also, in the APIs section, I pressed `+ Create API`, called it Parent App, and have it the identifier `https://parentapp:5173`.
### Video Walkthrough
The video is too large to be added to Git. [Please find it hosted on my Google Drive](https://drive.google.com/file/d/1gxRaSEmU6si2eaSka0J2ExhRpEpXRMju/view?usp=sharing)

## Potential Problems
As I believe this is the most idiomatic approach, the potential problems I have come up with are minor, but they are still worth considering:  
1. A new messaging paradigm that isn't currently being used.
    - As I understand it the SDK that games implement does already communicate with the parent webpage, such as when it triggers happy time. If the preexisting implementation doesn't use postMessage(), choosing to use some other messaging paradigm, then configuring two paradigms in parallel would be quite messy and confusing. Perhaps there are good reasons to use a different paradigm in different places, but we should first consider whether this is definitely the case, and if they can be reconciled at all then we should aim to do so.
2. Increase complexity of the parent website.
    - If the parent website currently doesn't handle authorisation and sessions, then my proposal would include setting up a full authorisation flow which is handled by the parent website. Authorisation is a very important and often complicated thing to do, and so introducing this complexity is not something to be done lightly.
        - However, the problem definition does state that you are already developing a registration system, and of course users need to be able to log into the parent website for its own reasons, so it seems that this complexity will be required with any implementation.
3. Long list of allowed origin-domains.
    - As it is important to check that the messages received are coming from trusted sources, we would need a quick and secure method of keeping track of all approved domains and checking against them at runtime.
        - A hashset or keyword-tree would be obvious data structures to use for speed of retrieval, and I imagine it is very unlikely that the list of approved domains gets so long that it would cause performance impacts when stored in memory. That being said, I don't know what we are targetting as the lowest level of hardware and there is a chance that this could become a concern.
4. Versioning and Consistency.
    - We are defining a message object with types, and then building message handlers based on those types. In any scenario where we are defining an API like this we need to consider versioning, naming conventions, and how we will continue to support earlier versions if we ever need to make breaking changes.
    - I imagine you have already considered these things when developing your current SDK.