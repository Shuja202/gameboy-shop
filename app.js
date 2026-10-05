const CHECKOUT_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1";
const VIDEO_ID = "dQw4w9WgXcQ";
const EMBED_URL = `https://www.youtube.com/embed/${VIDEO_ID}?enablejsapi=1&playsinline=1&rel=0&origin=${encodeURIComponent(location.origin)}`;

let player = null;
let playerReady = false;
let pendingPlay = false; // "Place order" clicked before the player was ready
let started = false;     // real playback has begun at least once
let warmupTimer = null;
let listenTimer = null;

// Load the player in the background so it can start instantly on "Place order"
function preloadPlayer() {
  if (player) return;
  player = document.createElement("iframe");
  player.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  // YouTube rejects embeds without a Referer (error 153); tunnels often strip it via Referrer-Policy
  player.referrerPolicy = "strict-origin-when-cross-origin";
  player.title = "Order confirmation";
  // Keep pinging until the YouTube player answers with onReady
  player.onload = () => {
    clearInterval(listenTimer);
    listenTimer = setInterval(() => {
      if (playerReady) return clearInterval(listenTimer);
      player.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
    }, 250);
  };
  player.src = EMBED_URL;
  $("videoFrame").appendChild(player);
}

function playerCommand(func, args = []) {
  player.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

// Buffer the first moments silently so real playback starts with no delay
function warmUp() {
  playerCommand("mute");
  playerCommand("playVideo");
  warmupTimer = setTimeout(() => {
    if (started) return;
    playerCommand("pauseVideo");
    playerCommand("seekTo", [0, true]);
  }, 1500);
}

function startPlayback() {
  clearTimeout(warmupTimer);
  if (!started) playerCommand("seekTo", [0, true]);
  started = true;
  playerCommand("unMute");
  playerCommand("setVolume", [100]);
  playerCommand("playVideo");
}

window.addEventListener("message", (e) => {
  if (!player || e.source !== player.contentWindow) return;
  let data;
  try { data = JSON.parse(e.data); } catch { return; }
  if (data.event !== "onReady" || playerReady) return;
  playerReady = true;
  if (pendingPlay) startPlayback();
  else warmUp();
});

function openVideo() {
  // Audio first: kick off playback before any UI work
  if (player && playerReady) {
    startPlayback();
  } else {
    pendingPlay = true;
    preloadPlayer();
  }

  closeCart();
  $("videoModal").classList.add("open");
  $("videoModal").setAttribute("aria-hidden", "false");
}

function closeVideo() {
  $("videoModal").classList.remove("open");
  $("videoModal").setAttribute("aria-hidden", "true");
  pendingPlay = false;
  if (player && playerReady && started) playerCommand("pauseVideo");
}

const item = { name: "The Original Handheld", price: 0, img: "images/gameboy.webp" };
let qty = 0;

const $ = (id) => document.getElementById(id);
const money = (n) => `$${n.toFixed(2)}`;

function render() {
  $("cartCount").textContent = qty;
  const items = $("cartItems");

  if (qty === 0) {
    items.innerHTML = `<p class="empty">Your cart is empty.</p>`;
  } else {
    items.innerHTML = `
      <div class="line-item">
        <img src="${item.img}" alt="" class="thumb">
        <div>
          <strong>${item.name}</strong>
          <span class="muted">Qty ${qty}</span>
          <button class="remove" id="removeItem">Remove</button>
        </div>
        <span>${money(item.price * qty)}</span>
      </div>`;
    $("removeItem").onclick = () => { qty = 0; render(); };
  }

  $("subtotal").textContent = money(item.price * qty);
  $("total").textContent = money(item.price * qty);
  $("toCheckout").disabled = qty === 0;
}

function showView(view) {
  const checkout = view === "checkout";
  $("cartView").hidden = checkout;
  $("checkoutView").hidden = !checkout;
  $("drawerTitle").textContent = checkout ? "Checkout" : "Your cart";
}

function openCart() {
  showView("cart");
  document.body.classList.add("cart-open");
  $("drawer").setAttribute("aria-hidden", "false");
}

function closeCart() {
  document.body.classList.remove("cart-open");
  $("drawer").setAttribute("aria-hidden", "true");
}

$("addToCart").onclick = () => {
  qty = 1; // 1 per customer
  render();
  const badge = $("cartCount");
  badge.classList.add("bump");
  setTimeout(() => badge.classList.remove("bump"), 250);
  openCart();
};

$("openCart").onclick = openCart;
$("closeCart").onclick = closeCart;
$("scrim").onclick = closeCart;
$("toCheckout").onclick = () => { showView("checkout"); preloadPlayer(); };
$("backToCart").onclick = () => showView("cart");

$("placeOrder").onclick = openVideo;
$("closeVideo").onclick = closeVideo;
$("videoModal").onclick = (e) => { if (e.target.id === "videoModal") closeVideo(); };
$("videoFallback").href = CHECKOUT_URL;

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeCart(); closeVideo(); }
});

render();
