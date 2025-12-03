// === SPOTIFY CONNECTION ===
// help from chatGPT
// Prompt: "ok i have an account set up on the spotify developer platform, 
// how do i go about making it work in javascript? my end goal is to show user's top 5 tracks in the website"

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

document.getElementById("spotify_login").addEventListener("click", async() => {
  const verifier = generateRandomString(64);
  const challenge = base64urlencode(await sha256(verifier));

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams({
    client_id: "aedeb4be4b254f8387739b20ba22d834",
    response_type: "code",
    redirect_uri: "https://group-project-015-03.onrender.com/spotify_callback",
    scope: "user-top-read",
    code_challenge_method: "S256",
    code_challenge: challenge
  });

  window.location = `https://accounts.spotify.com/authorize?${params}`;

});

async function getAccessToken(code) {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams({
    client_id: "aedeb4be4b254f8387739b20ba22d834",
    grant_type: "authorization_code",
    code,
    redirect_uri: "https://group-project-015-03.onrender.com/spotify_callback",
    code_verifier: verifier
  });

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  return await result.json();
}

(async function () {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (!code) {
    console.error("No code found in URL");
    return;
  }

  const res = await fetch("/auth/spotify/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  const data = await res.json();
  console.log("Callback response:", data);

  // redirect user after linking
  window.location.href = "/profile";
})();


async function getTopTracks() {
  const token = localStorage.getItem("access_token");

  const res = await fetch("https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5", {
    headers: { Authorization: `Bearer ${token}` }
  });

  return (await res.json()).items;
}

async function showTracks() {
  const tracks = await getTopTracks();
  document.getElementById("results").innerHTML =
    tracks.map(
      t => `<p>${t.name} — ${t.artists.map(a => a.name).join(", ")}</p>`
    ).join("");
}

if (localStorage.getItem("access_token")) {
  showTracks();
}
