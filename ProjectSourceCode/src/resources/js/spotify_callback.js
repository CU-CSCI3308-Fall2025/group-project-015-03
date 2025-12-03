// === SPOTIFY CONNECTION ===
// help from chatGPT
// Initial Prompt: "ok i have an account set up on the spotify developer platform, 
// how do i go about making it work in javascript? my end goal is to show user's top 5 tracks in the website"
// additional prompts required to fix the code it originally returned
(async function () {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (!code) {
    console.error("No code in URL");
    return;
  }

  const res = await fetch("/auth/spotify/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await res.json();
  console.log("Access token saved?", data);

  window.location.href = "/profile";
})();
