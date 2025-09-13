// Digital Asset Marketplace - JavaScript
// Simple in-browser 'blockchain' + marketplace demo (no external deps)
// Data is persisted to localStorage to simulate a chain state across reloads.

const $ = (q)=>document.querySelector(q);
const $$ = (q)=>Array.from(document.querySelectorAll(q));

// ------------------------ Audio System ------------------------
let audioContext;
function initAudio(){
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) {
    console.log('Web Audio API not supported');
  }
}

function playClickSound(){
  if(!audioContext) return;
  
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch(e) {
    console.log('Audio playback failed');
  }
}

function playSuccessSound(){
  if(!audioContext) return;
  
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch(e) {
    console.log('Audio playback failed');
  }
}

function playErrorSound(){
  if(!audioContext) return;
  
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch(e) {
    console.log('Audio playback failed');
  }
}

// ------------------------ Utilities ------------------------
async function sha256(str){
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function uid(prefix=""){
  return prefix + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-4);
}

function saveState(){ 
  localStorage.setItem("dam_state", JSON.stringify(state)); 
}

function loadState(){
  try { 
    return JSON.parse(localStorage.getItem("dam_state")) || null; 
  } catch(_){ 
    return null; 
  }
}

function fmtCoin(n){ 
  return Number(n).toFixed(2); 
}

function now(){ 
  return new Date().toISOString(); 
}

// ------------------------ State ------------------------
let state = loadState() || {
  accounts: [
    {address:"0xA11CE", username:"alice", passwordHash: "", passwordPlain: "", balance: 100},
    {address:"0xB0B", username:"bob", passwordHash: "", passwordPlain: "", balance: 100},
    {address:"0xCARA", username:"cara", passwordHash: "", passwordPlain: "", balance: 100},
  ],
  active: null, // Changed: Null until logged in
  assets: [], // {id, name, desc, image, owner, forSale, price}
  chain: []   // blocks: {index, timestamp, txs:[], prevHash, hash}
};

// Initialize default passwords (for demo only, not secure)
(async function initDefaultPasswords(){
  for(let acc of state.accounts){
    if(!acc.passwordHash) {
      const plain = acc.username + "123";
      acc.passwordPlain = plain;
      acc.passwordHash = await sha256(plain);
    }
  }
  saveState();
})();

// ------------------------ Auth Logic ------------------------
let isLoggedIn = localStorage.getItem("dam_loggedIn") === "true";
if(isLoggedIn && state.active !== null){
  $("#authContainer").style.display = "none";
  $("#appContent").style.display = "block";
} else {
  $("#authContainer").classList.add("visible");
  $("#authContainer").style.display = "flex";
  document.body.classList.add("auth-open");
  document.documentElement.classList.add("auth-open");
}

async function login(){
  playClickSound();
  const username = $("#loginUsername").value.trim();
  const password = $("#loginPassword").value;
  const errorEl = $("#loginError");
  errorEl.style.display = "none";
  
  if(!username || !password){
    errorEl.textContent = "Please enter username and password";
    errorEl.style.display = "block";
    playErrorSound();
    return;
  }
  
  // Show loading state
  const loginBtn = $("#loginBtn");
  const originalText = loginBtn.textContent;
  loginBtn.innerHTML = '<span class="loading"></span> Logging in...';
  loginBtn.disabled = true;
  
  try {
    const passwordHash = await sha256(password);
    const accountIndex = state.accounts.findIndex(a => a.username === username && a.passwordHash === passwordHash);
    
    if(accountIndex === -1){
      errorEl.textContent = "Invalid username or password";
      errorEl.style.display = "block";
      playErrorSound();
      return;
    }
    
    state.active = accountIndex;
    isLoggedIn = true;
    localStorage.setItem("dam_loggedIn", "true");
    saveState();
    
    $("#authContainer").classList.remove("visible");
    setTimeout(() => {
      $("#authContainer").style.display = "none";
      $("#appContent").style.display = "block";
      document.body.classList.remove("auth-open");
      document.documentElement.classList.remove("auth-open");
    }, 300);
    
    renderWallet();
    renderAssets();
    renderMarket();
    renderChain();
    playSuccessSound();
  } catch (error) {
    errorEl.textContent = "Login failed. Please try again.";
    errorEl.style.display = "block";
    playErrorSound();
  } finally {
    loginBtn.textContent = originalText;
    loginBtn.disabled = false;
  }
}

async function signup(){
  playClickSound();
  const username = $("#signupUsername").value.trim();
  const password = $("#signupPassword").value;
  const errorEl = $("#signupError");
  errorEl.style.display = "none";
  
  if(!username || !password){
    errorEl.textContent = "Please enter username and password";
    errorEl.style.display = "block";
    playErrorSound();
    return;
  }
  
  if(state.accounts.some(a => a.username === username)){
    errorEl.textContent = "Username already taken";
    errorEl.style.display = "block";
    playErrorSound();
    return;
  }
  
  // Show loading state
  const signupBtn = $("#signupBtn");
  const originalText = signupBtn.textContent;
  signupBtn.innerHTML = '<span class="loading"></span> Signing up...';
  signupBtn.disabled = true;
  
  try {
    const address = `0x${username.toUpperCase().slice(0,4)}${uid().slice(-4)}`;
    const passwordHash = await sha256(password);
    const balance = 100;
    
    state.accounts.push({address, username, passwordHash, passwordPlain: password, balance});
    await addBlock([{type:"CREATE_ACCOUNT", address, username, balance}]);
    
    state.active = state.accounts.length - 1;
    isLoggedIn = true;
    localStorage.setItem("dam_loggedIn", "true");
    saveState();
    
    $("#authContainer").classList.remove("visible");
    setTimeout(() => {
      $("#authContainer").style.display = "none";
      $("#appContent").style.display = "block";
      document.body.classList.remove("auth-open");
    }, 300);
    
    renderWallet();
    renderAssets();
    renderMarket();
    renderChain();
    playSuccessSound();
  } catch (error) {
    errorEl.textContent = "Signup failed. Please try again.";
    errorEl.style.display = "block";
    playErrorSound();
  } finally {
    signupBtn.textContent = originalText;
    signupBtn.disabled = false;
  }
}

function logout(){
  playClickSound();
  state.active = null;
  isLoggedIn = false;
  localStorage.setItem("dam_loggedIn", "false");
  saveState();
  $("#appContent").style.display = "none";
  $("#authContainer").style.display = "flex";
  $("#authContainer").classList.add("visible");
  document.body.classList.add("auth-open");
  $("#loginUsername").value = "";
  $("#loginPassword").value = "";
  $("#signupUsername").value = "";
  $("#signupPassword").value = "";
}

// ------------------------ Blockchain ------------------------
async function addBlock(txs){
  const prev = state.chain[state.chain.length-1];
  const block = {
    index: state.chain.length,
    timestamp: now(),
    txs,
    prevHash: prev ? prev.hash : "GENESIS"
  };
  block.hash = await sha256(JSON.stringify(block));
  state.chain.push(block);
  saveState();
  renderChain();
}

function txMint(minter, assetId, name, desc){ 
  return {type:"MINT", minter, assetId, name, desc}; 
}

function txList(seller, assetId, price){ 
  return {type:"LIST", seller, assetId, price}; 
}

function txBuy(buyer, seller, assetId, price){ 
  return {type:"BUY", buyer, seller, assetId, price}; 
}

function txTransfer(from, to, assetId){ 
  return {type:"TRANSFER", from, to, assetId}; 
}

function txFaucet(to, amount){ 
  return {type:"FAUCET", to, amount}; 
}

// ------------------------ Wallet ------------------------
function activeAccount(){ 
  return state.accounts[state.active]; 
}

function setActive(i){
  if(!isLoggedIn) return;
  state.active = i;
  saveState();
  renderWallet();
  renderAssets();
  renderMarket();
}

async function createAccount(){
  if(!isLoggedIn) return;
  const address = prompt("Enter new account address (e.g., 0xNEW):");
  if(!address || state.accounts.some(a => a.address === address)){ 
    alert("Invalid or duplicate address"); 
    return; 
  }
  const username = prompt("Enter username for this account:");
  if(!username || state.accounts.some(a => a.username === username)){ 
    alert("Invalid or duplicate username"); 
    return; 
  }
  const password = prompt("Enter password:");
  if(!password){ 
    alert("Password required"); 
    return; 
  }
  const balance = Number(prompt("Starting balance (default 100):", "100")) || 100;
  if(isNaN(balance) || balance < 0){ 
    alert("Invalid balance"); 
    return; 
  }
  const passwordHash = await sha256(password);
  state.accounts.push({address, username, passwordHash, balance});
  await addBlock([{type:"CREATE_ACCOUNT", address, username, balance}]);
  setActive(state.accounts.length - 1);
}

// ------------------------ Marketplace Logic ------------------------
async function mintAsset(){
  if(!isLoggedIn) return;
  playClickSound();
  const name = $("#mintName").value.trim();
  const desc = $("#mintDesc").value.trim();
  const image = $("#mintImg").value.trim();
  const category = $("#mintCategory").value;
  const rarity = $("#mintRarity").value;
  if(!name){ 
    alert("Enter a name"); 
    playErrorSound(); 
    return; 
  }
  const acct = activeAccount();
  const id = uid("asset_");
  state.assets.push({id, name, desc, image, category, rarity, owner: acct.address, forSale:false, price:0, minted: now()});
  await addBlock([txMint(acct.address, id, name, desc, category, rarity)]);
  clearMintForm();
  renderAssets(); 
  renderMarket(); 
  renderWallet();
  playSuccessSound();
}

function clearMintForm(){
  $("#mintName").value = "";
  $("#mintDesc").value = "";
  $("#mintImg").value = "";
  $("#mintCategory").value = "art";
  $("#mintRarity").value = "common";
  updateMintPreview();
}

function updateMintPreview(){
  const name = $("#mintName").value.trim() || "Asset Name";
  const category = $("#mintCategory").selectedOptions[0]?.text || "Category";
  const rarity = $("#mintRarity").value || "common";
  
  const previewCard = document.querySelector(".preview-card");
  if(previewCard){
    previewCard.querySelector(".preview-name").textContent = name;
    previewCard.querySelector(".preview-category").textContent = category;
    previewCard.querySelector(".preview-rarity").textContent = rarity.charAt(0).toUpperCase() + rarity.slice(1);
    
    // Set rarity color
    const rarityEl = previewCard.querySelector(".preview-rarity");
    rarityEl.className = "preview-rarity";
    if(rarity === "rare") rarityEl.style.color = "#7aa2ff";
    else if(rarity === "epic") rarityEl.style.color = "#9d4edd";
    else if(rarity === "legendary") rarityEl.style.color = "#f77f00";
    else rarityEl.style.color = "var(--muted)";
  }
}

async function listAsset(assetId){
  if(!isLoggedIn) return;
  const a = state.assets.find(x=>x.id===assetId);
  if(!a) return;
  if(a.owner !== activeAccount().address){ 
    alert("Only owner can list"); 
    return; 
  }
  const priceStr = prompt("Set price in COIN:", "25");
  if(!priceStr) return;
  const price = Number(priceStr);
  if(isNaN(price)||price<=0){ 
    alert("Invalid price"); 
    return; 
  }
  a.forSale = true; 
  a.price = price;
  await addBlock([txList(a.owner, a.id, price)]);
  renderAssets(); 
  renderMarket();
}

async function delistAsset(assetId){
  if(!isLoggedIn) return;
  const a = state.assets.find(x=>x.id===assetId);
  if(!a) return;
  if(a.owner !== activeAccount().address){ 
    alert("Only owner can delist"); 
    return; 
  }
  a.forSale = false; 
  a.price = 0;
  await addBlock([{type:"DELIST", seller:a.owner, assetId:a.id}]);
  renderAssets(); 
  renderMarket();
}

async function buyAsset(assetId){
  if(!isLoggedIn) return;
  const a = state.assets.find(x=>x.id===assetId);
  if(!a || !a.forSale) return;
  const buyer = activeAccount();
  if(buyer.address === a.owner){ 
    alert("You already own this"); 
    return; 
  }
  if(buyer.balance < a.price){ 
    alert("Insufficient balance"); 
    return; 
  }
  const seller = state.accounts.find(x=>x.address===a.owner);
  buyer.balance -= a.price;
  seller.balance += a.price;
  const prevOwner = a.owner;
  a.owner = buyer.address;
  a.forSale = false;
  await addBlock([txBuy(buyer.address, prevOwner, a.id, a.price)]);
  renderWallet(); 
  renderAssets(); 
  renderMarket();
}

async function transferAsset(assetId){
  if(!isLoggedIn) return;
  const a = state.assets.find(x=>x.id===assetId);
  if(!a) return;
  if(a.owner !== activeAccount().address){ 
    alert("Only owner can transfer"); 
    return; 
  }
  const toAddr = prompt("Enter recipient address:");
  if(!toAddr || !state.accounts.some(acc => acc.address === toAddr)){ 
    alert("Invalid recipient"); 
    return; 
  }
  const prevOwner = a.owner;
  a.owner = toAddr;
  await addBlock([txTransfer(prevOwner, toAddr, a.id)]);
  renderAssets(); 
  renderMarket();
}

async function faucet(){
  if(!isLoggedIn) return;
  const acct = activeAccount();
  acct.balance += 50;
  await addBlock([txFaucet(acct.address, 50)]);
  renderWallet();
}

// ------------------------ Account Deletion ------------------------
async function deleteActiveAccount(){
  if(!isLoggedIn) return;
  const acct = activeAccount();
  const confirm1 = confirm(`Delete account ${acct.address} (${acct.username})? This cannot be undone.`);
  if(!confirm1) return;

  // Decide asset handling: transfer to another user or burn (remove)
  const ownedAssets = state.assets.filter(a=>a.owner===acct.address);
  let action = "burn";
  if(state.accounts.length > 1 && ownedAssets.length > 0){
    action = prompt("Type 'transfer' to move assets to another user, or 'burn' to remove them:", "transfer") || "burn";
  }

  let recipientAddr = null;
  if(action.toLowerCase() === "transfer" && state.accounts.length > 1){
    const others = state.accounts.filter((_,i)=>i!==state.active);
    const list = others.map(u=>`${u.address} (${u.username})`).join("\n");
    recipientAddr = prompt(`Enter recipient address for asset transfer:\n${list}`);
    if(!recipientAddr || !others.some(u=>u.address===recipientAddr)){
      alert("Invalid recipient. Aborting."); 
      return;
    }
  }

  // Prepare txs for chain
  const txs = [];
  // Handle assets
  for(const a of ownedAssets){
    if(action.toLowerCase() === "transfer" && recipientAddr){
      a.owner = recipientAddr; 
      a.forSale = false; 
      a.price = 0;
      txs.push(txTransfer(acct.address, recipientAddr, a.id));
    } else {
      // burn/remove asset
      state.assets = state.assets.filter(x=>x.id!==a.id);
      txs.push({type:"BURN", owner: acct.address, assetId: a.id});
    }
  }

  // Remove account
  const removed = state.accounts.splice(state.active, 1)[0];
  txs.push({type:"DELETE_ACCOUNT", address: removed.address, username: removed.username});

  // Reset active index
  state.active = null; 
  isLoggedIn = false; 
  localStorage.setItem("dam_loggedIn","false");
  await addBlock(txs);
  saveState();

  // UI reset
  $("#appContent").style.display = "none";
  $("#authContainer").style.display = "flex";
  $("#authContainer").classList.add("visible");
  $("#loginUsername").value = "";
  $("#loginPassword").value = "";
  $("#signupUsername").value = "";
  $("#signupPassword").value = "";
}

// Delete user by index (used from Reveal Users list)
async function deleteUserByIndex(index){
  if(index<0 || index>=state.accounts.length){ 
    alert('Invalid user'); 
    return; 
  }
  const target = state.accounts[index];
  const isCurrent = (state.active === index) && isLoggedIn;
  const ok = confirm(`Delete user ${target.username} (${target.address})? This cannot be undone.`);
  if(!ok) return;

  // Handle assets owned by target: burn them
  const owned = state.assets.filter(a=>a.owner===target.address);
  const txs = [];
  for(const a of owned){
    state.assets = state.assets.filter(x=>x.id!==a.id);
    txs.push({type:"BURN", owner: target.address, assetId: a.id});
  }

  // Remove account
  const removed = state.accounts.splice(index,1)[0];
  txs.push({type:"DELETE_ACCOUNT", address: removed.address, username: removed.username});

  // Fix active index if needed
  if(state.active !== null){
    if(index < state.active) state.active -= 1; // shifted left
    else if(index === state.active) state.active = null;
  }

  await addBlock(txs);
  saveState();

  // If we deleted current logged-in user, force logout UI
  if(isCurrent){
    isLoggedIn = false; 
    localStorage.setItem("dam_loggedIn","false");
    $("#appContent").style.display = "none";
    $("#authContainer").style.display = "flex";
    $("#authContainer").classList.add("visible");
    document.body.classList.add("auth-open");
    document.documentElement.classList.add("auth-open");
  } else if(isLoggedIn && state.active !== null){
    renderWallet(); 
    renderAssets(); 
    renderMarket(); 
    renderChain();
  }
}

// ------------------------ Rendering ------------------------
function renderWallet(){
  if(!isLoggedIn) return;
  const sel = $("#accountSelect");
  sel.innerHTML = "";
  state.accounts.forEach((a, i)=>{
    const opt = document.createElement("option");
    opt.value = i; 
    opt.textContent = `${a.address} (${a.username})`;
    if(i===state.active) opt.selected = true;
    sel.appendChild(opt);
  });
  $("#acctAddr").textContent = activeAccount().address;
  $("#acctBal").textContent = fmtCoin(activeAccount().balance);
  
  // Update live stats
  $("#totalUsers").textContent = state.accounts.length;
  $("#totalAssets").textContent = state.assets.length;
  $("#totalBlocks").textContent = state.chain.length;
}

function assetCard(a, isMine=false){
  const div = document.createElement("div");
  div.className = "asset";
  const cover = document.createElement("div");
  cover.className = "cover";
  if(a.image){
    const img = document.createElement("img"); 
    img.src = a.image; 
    img.alt = a.name;
    cover.appendChild(img);
  } else {
    cover.textContent = "🖼️";
    cover.style.fontSize = "24px";
    cover.style.color = "var(--muted)";
  }
  const meta = document.createElement("div");
  meta.className = "meta";
  const name = document.createElement("div"); 
  name.className="name"; 
  name.textContent=a.name;
  const desc = document.createElement("div"); 
  desc.className="desc"; 
  desc.textContent = a.desc || "No description";
  const owner = document.createElement("div"); 
  owner.className="owner"; 
  owner.textContent=`👤 ${a.owner.slice(-6)}`;
  const price = document.createElement("div"); 
  price.innerHTML = a.forSale? 
    `<span class="price-tag">💰 ${fmtCoin(a.price)}</span>` : 
    `<span class="muted">🔒 Not for sale</span>`;
  meta.append(name, desc, owner, price);
  const acts = document.createElement("div"); 
  acts.className="actions";
  if(isMine){
    if(a.forSale){
      const del = document.createElement("button"); 
      del.className="btn danger"; 
      del.textContent="❌";
      del.title = "Delist";
      del.onclick = ()=>delistAsset(a.id);
      acts.appendChild(del);
    } else {
      const list = document.createElement("button"); 
      list.className="btn"; 
      list.textContent="💰";
      list.title = "List for sale";
      list.onclick = ()=>listAsset(a.id);
      acts.appendChild(list);
    }
    const transfer = document.createElement("button"); 
    transfer.className="btn outline"; 
    transfer.textContent="↗️";
    transfer.title = "Transfer";
    transfer.onclick = ()=>transferAsset(a.id);
    acts.appendChild(transfer);
  } else {
    if(a.forSale){
      const buy = document.createElement("button"); 
      buy.className="btn"; 
      buy.textContent=`💰 ${fmtCoin(a.price)}`;
      buy.title = `Buy for ${fmtCoin(a.price)} COIN`;
      buy.onclick = ()=>buyAsset(a.id);
      acts.appendChild(buy);
    }
  }
  div.append(cover, meta, acts);
  return div;
}

function renderAssets(){
  if(!isLoggedIn) return;
  const mine = state.assets.filter(a=>a.owner===activeAccount().address);
  const c = $("#myAssets"); 
  c.innerHTML="";
  if(mine.length===0){ 
    c.innerHTML="<p class='empty-state'>No assets yet.</p>"; 
    return; 
  }
  mine.forEach(a=>c.appendChild(assetCard(a,true)));
}

function renderMarket(){
  if(!isLoggedIn) return;
  const items = state.assets.filter(a=>a.forSale);
  const c = $("#marketplace"); 
  c.innerHTML="";
  if(items.length===0){ 
    c.innerHTML="<p class='empty-state'>Nothing for sale yet.</p>"; 
    return; 
  }
  items.forEach(a=>c.appendChild(assetCard(a,false)));
}

function renderChain(){
  if(!isLoggedIn) return;
  const c = $("#chainView"); 
  if(!c) return;
  c.innerHTML = "";
  state.chain.slice().reverse().forEach(b=>{
    const el = document.createElement("div");
    el.className = "block";
    el.innerHTML = `<h4>Block #${b.index}</h4>
      <div class="small muted">${b.timestamp}</div>
      <div class="small">Prev: <code>${b.prevHash}</code></div>
      <div class="small">Hash: <code>${b.hash}</code></div>
      <details><summary>${b.txs.length} tx(s)</summary><pre>${JSON.stringify(b.txs,null,2)}</pre></details>`;
    c.appendChild(el);
  });
}

// ------------------------ Import/Export ------------------------
function exportState(){
  if(!isLoggedIn) return;
  const data = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href=url; 
  a.download="dam_state.json"; 
  a.click();
  URL.revokeObjectURL(url);
}

function importState(){
  if(!isLoggedIn) return;
  const inp = document.createElement("input");
  inp.type="file"; 
  inp.accept="application/json";
  inp.onchange = () => {
    const f = inp.files[0]; 
    if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{
      try{
        const data = JSON.parse(r.result);
        if(!data.accounts || !data.chain) throw new Error("Invalid file");
        state = data; 
        saveState();
        if(state.active !== null){
          isLoggedIn = true;
          localStorage.setItem("dam_loggedIn", "true");
          $("#authContainer").style.display = "none";
          $("#appContent").style.display = "block";
        }
        setActive(data.active||0);
        renderChain();
        alert("State imported.");
      }catch(e){ 
        alert("Import failed: "+e.message); 
      }
    };
    r.readAsText(f);
  };
  inp.click();
}

// ------------------------ Init ------------------------
window.addEventListener("DOMContentLoaded", ()=>{
  // Auth tab switching
  $$(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $$(".auth-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      $("#loginForm").classList.toggle("hidden", tab.dataset.tab !== "login");
      $("#signupForm").classList.toggle("hidden", tab.dataset.tab !== "signup");
    });
  });
  
  $("#switchToSignup").addEventListener("click", () => {
    $$(".auth-tab")[1].click();
  });
  
  $("#switchToLogin").addEventListener("click", () => {
    $$(".auth-tab")[0].click();
  });
  
  $("#loginBtn").addEventListener("click", login);
  $("#signupBtn").addEventListener("click", signup);
  $("#logoutBtn").addEventListener("click", logout);
  $("#accountSelect").addEventListener("change", e=> setActive(Number(e.target.value)));
  $("#mintBtn").addEventListener("click", mintAsset);
  $("#clearMintBtn").addEventListener("click", clearMintForm);
  
  // Live preview updates
  $("#mintName").addEventListener("input", updateMintPreview);
  $("#mintCategory").addEventListener("change", updateMintPreview);
  $("#mintRarity").addEventListener("change", updateMintPreview);
  
  $("#faucetBtn").addEventListener("click", faucet);
  $("#createAccountBtn").addEventListener("click", createAccount);
  $("#explorerBtn").addEventListener("click", ()=> $("#explorerModal").showModal());
  $("#deleteAccountBtn").addEventListener("click", deleteActiveAccount);
  $("#helpBtn").addEventListener("click", ()=> $("#helpModal").showModal());
  $("#exportState").addEventListener("click", (e)=>{ e.preventDefault(); exportState(); });
  $("#importState").addEventListener("click", (e)=>{ e.preventDefault(); importState(); });
  
  $("#revealUsersBtn").addEventListener("click", ()=>{
    const box = $("#userList");
    if(box.style.display === "none"){
      // Check PIN first
      const pin = prompt("🔐 Enter PIN to reveal users:");
      if(pin !== "7829"){
        alert("❌ Invalid PIN. Access denied.");
        return;
      }
      
      const rows = state.accounts.map((a,i)=>`<div class="user-row"><span>👤 ${a.username}</span><span>🔑 ${a.passwordPlain||'(unknown)'}</span><button class="btn danger small" data-del="${i}">🗑️ Delete</button></div>`).join("");
      box.innerHTML = rows || '<div class="muted">No users found.</div>';
      box.style.display = "block";
      box.querySelectorAll('button[data-del]').forEach(btn=>{
        btn.addEventListener('click', async (e)=>{
          const idx = Number(e.currentTarget.getAttribute('data-del'));
          await deleteUserByIndex(idx);
          // refresh list
          $("#revealUsersBtn").click();
          $("#revealUsersBtn").click();
        });
      });
    } else {
      box.style.display = "none";
    }
  });

  // Handle Enter key in auth forms
  $("#loginPassword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });
  $("#signupPassword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") signup();
  });

  // Prefill a random image URL in the Mint form
  $("#mintImg").value = `https://picsum.photos/seed/${uid()}/400/300`;
  
  // Initialize mint preview
  updateMintPreview();
  
  // Initialize audio
  initAudio();
  
  // Add click sounds to all buttons
  document.addEventListener('click', (e) => {
    if(e.target.matches('button') || e.target.closest('button')){
      // Only play click sound for buttons that don't have specific sound handling
      const btn = e.target.closest('button');
      if(!btn.id || (!btn.id.includes('login') && !btn.id.includes('signup') && !btn.id.includes('mint') && !btn.id.includes('logout'))){
        playClickSound();
      }
    }
  });

  if(state.chain.length===0){
    (async()=>{
      const genesis = {index:0, timestamp: now(), txs:[{type:"GENESIS"}], prevHash:"NONE"};
      genesis.hash = await sha256(JSON.stringify(genesis));
      state.chain.push(genesis);
      saveState();
      renderChain();
      if(!isLoggedIn) $("#helpModal").showModal();
    })();
  } else if(isLoggedIn){
    renderWallet(); 
    renderAssets(); 
    renderMarket(); 
    renderChain();
  }
});
