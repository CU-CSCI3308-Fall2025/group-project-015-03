function generateRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const btn = document.getElementById("spotify_login");
if (btn) {
  btn.addEventListener("click", async () => {
    const verifier = generateRandomString(64);
    const challenge = base64url(await sha256(verifier));

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams({
      client_id: "aedeb4be4b254f8387739b20ba22d834",
      response_type: "code",
      redirect_uri: "https://group-project-015-03.onrender.com/spotify_callback",
      scope: "user-top-read",
      code_challenge_method: "S256",
      code_challenge: challenge,
    });

    window.location = `https://accounts.spotify.com/authorize?${params}`;
  });
}
