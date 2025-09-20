const SIDEBAR = document.getElementById("sidebar");
const TOGGLE_BTN = document.getElementById("toggle-btn");
const LOGIN_BOX = document.getElementById("login-box");
const APP_PLACEHOLDER = document.getElementById("app-placeholder");
const PAGE_USER = document.getElementById("page-user");
const PAGE_TITLE = document.getElementById("page-title");
const TOTAL_JAM = document.getElementById("total-jam");
const CONTENT_AREA = document.getElementById("content-area");
const TOAST = document.getElementById("toast");

TOGGLE_BTN.addEventListener("click", () => {
  SIDEBAR.classList.toggle("collapsed");
});

function showToast(msg, type = "info") {
  TOAST.textContent = msg;
  TOAST.className = `toast show ${type}`;
  setTimeout(() => TOAST.classList.remove("show"), 3000);
}

function initUserStore() {
  if (!localStorage.getItem("user_store")) {
    const store = {
      admin: { password: "admin123", role: "admin" },
      pic1: { password: "pic123", role: "user" },
    };
    localStorage.setItem("user_store", JSON.stringify(store));
  }
}

function getUserStore() {
  return JSON.parse(localStorage.getItem("user_store") || "{}");
}

function loginUser(username, password) {
  const store = getUserStore();
  if (store[username] && store[username].password === password) {
    localStorage.setItem("logged_in_user", username);
    return store[username].role;
  }
  return null;
}

function logoutUser() {
  localStorage.removeItem("logged_in_user");
  location.reload();
}

function showAppFor(username) {
  const store = getUserStore();
  const role = store[username]?.role || "user";
  LOGIN_BOX.style.display = "none";
  SIDEBAR.classList.remove("hidden");
  APP_PLACEHOLDER.classList.remove("hidden");
  PAGE_USER.textContent = username;
  PAGE_TITLE.textContent = role === "admin" ? "📊 Master Output" : `📝 Input & Rekap Lembur - ${username}`;
  if (role === "admin") renderMasterOutput();
  else renderPIC(username);
}
function hitungDurasi(jamMulai, jamSelesai) {
  const [hm, mm] = jamMulai.split(":").map(Number);
  const [hs, ms] = jamSelesai.split(":").map(Number);
  let start = hm * 60 + mm;
  let end = hs * 60 + ms;
  if (end < start) end += 24 * 60;
  return ((end - start) / 60).toFixed(2);
}

function simpanLembur(user) {
  const tgl = document.getElementById("tgl").value;
  const jm = document.getElementById("jamMulai").value;
  const js = document.getElementById("jamSelesai").value;
  const ur = document.getElementById("uraian").value;
  if (!tgl || !jm || !js || !ur) return showToast("Semua field wajib diisi", "error");

  const durasi = hitungDurasi(jm, js);
  const key = "data_" + user;
  const data = JSON.parse(localStorage.getItem(key) || "[]");
  data.push({ tgl, jm, js, ur, durasi });
  localStorage.setItem(key, JSON.stringify(data));
  showToast("Data lembur disimpan", "success");
  renderPIC(user);
}

function renderPIC(user) {
  const key = "data_" + user;
  const data = JSON.parse(localStorage.getItem(key) || "[]");
  CONTENT_AREA.innerHTML = `
    <div class="form-lembur">
      <label>Tanggal: <input type="date" id="tgl" /></label>
      <label>Jam Mulai: <input type="time" id="jamMulai" /></label>
      <label>Jam Selesai: <input type="time" id="jamSelesai" /></label>
      <label>Uraian: <input type="text" id="uraian" /></label>
      <button onclick="simpanLembur('${user}')">Simpan</button>
    </div>
    <div class="filter-box">
      <label>Filter Tanggal: <input type="date" id="filterDate" onchange="filterByDate('${user}')"/></label>
    </div>
    <table>
      <thead><tr><th>Tanggal</th><th>Jam</th><th>Uraian</th><th>Durasi</th></tr></thead>
      <tbody id="rekapBody"></tbody>
    </table>
  `;
  renderRekap(user, data);
}

function renderRekap(user, data) {
  const tbody = document.getElementById("rekapBody");
  tbody.innerHTML = "";
  let total = 0;
  data.forEach(d => {
    total += parseFloat(d.durasi);
    const row = document.createElement("tr");
    row.innerHTML = `<td>${d.tgl}</td><td>${d.jm} - ${d.js}</td><td>${d.ur}</td><td>${d.durasi}</td>`;
    tbody.appendChild(row);
  });
  TOTAL_JAM.textContent = "Total Jam: " + total.toFixed(2);
}

function filterByDate(user) {
  const selected = document.getElementById("filterDate").value;
  const key = "data_" + user;
  const data = JSON.parse(localStorage.getItem(key) || "[]");
  const filtered = data.filter(d => d.tgl === selected);
  renderRekap(user, filtered);
}
function renderMasterOutput() {
  const store = getUserStore();
  const users = Object.keys(store).filter(u => store[u].role === "user");
  const summary = users.map(u => {
    const data = JSON.parse(localStorage.getItem("data_" + u) || "[]");
    const total = data.reduce((sum, d) => sum + parseFloat(d.durasi), 0);
    return { user: u, total, count: data.length };
  });

  CONTENT_AREA.innerHTML = `
    <canvas id="chartSummary" height="120"></canvas>
    <button onclick="exportAllExcel()">Export Semua Excel</button>
    <button onclick="exportJSON()">Backup JSON</button>
    <table>
      <thead><tr><th>User</th><th>Total Jam</th><th#>Jumlah Entry</th></tr></thead>
      <tbody>${summary.map(s => `<tr><td>${s.user}</td><td>${s.total.toFixed(2)}</td><td>${s.count}</td></tr>`).join("")}</tbody>
    </table>
    <h3>Manajemen User</h3>
    <div id="user-setting"></div>
  `;
  renderChart(summary);
  renderUserSetting();
}

function renderChart(data) {
  const ctx = document.getElementById("chartSummary").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map(d => d.user),
      datasets: [{
        label: "Total Jam Lembur",
        data: data.map(d => d.total),
        backgroundColor: "#3498db"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function exportAllExcel() {
  const store = getUserStore();
  const users = Object.keys(store).filter(u => store[u].role === "user");
  const wb = XLSX.utils.book_new();
  users.forEach(u => {
    const data = JSON.parse(localStorage.getItem("data_" + u) || "[]");
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, u);
  });
  XLSX.writeFile(wb, "rekap_lembur_all.xlsx");
}

function exportJSON() {
  const allData = {};
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("data_")) {
      allData[k] = JSON.parse(localStorage.getItem(k));
    }
  });
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup_lembur.json";
  a.click();
}
function renderUserSetting() {
  const store = getUserStore();
  const container = document.getElementById("user-setting");
  container.innerHTML = `
    <table>
      <thead><tr><th>Username</th><th>Role</th><th>Password</th><th>Aksi</th></tr></thead>
      <tbody>
        ${Object.entries(store).map(([u, info]) => `
          <tr>
            <td>${u}</td>
            <td>${info.role}</td>
            <td><input type="text" value="${info.password}" onchange="updatePassword('${u}', this.value)" /></td>
            <td>
              <button onclick="deleteUser('${u}')">Hapus</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <h4>Tambah User Baru</h4>
    <label>Username: <input type="text" id="newUser" /></label>
    <label>Password: <input type="text" id="newPass" /></label>
    <label>Role: 
      <select id="newRole">
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
    </label>
    <button onclick="addUser()">Tambah</button>
  `;
}

function updatePassword(username, newPass) {
  const store = getUserStore();
  if (store[username]) {
    store[username].password = newPass;
    localStorage.setItem("user_store", JSON.stringify(store));
    showToast("Password diperbarui", "success");
  }
}

function deleteUser(username) {
  const store = getUserStore();
  if (confirm(`Hapus user ${username}?`)) {
    delete store[username];
    localStorage.removeItem("data_" + username);
    localStorage.setItem("user_store", JSON.stringify(store));
    renderUserSetting();
    showToast("User dihapus", "info");
  }
}

function addUser() {
  const u = document.getElementById("newUser").value;
  const p = document.getElementById("newPass").value;
  const r = document.getElementById("newRole").value;
  if (!u || !p) return showToast("Username dan password wajib diisi", "error");
  const store = getUserStore();
  if (store[u]) return showToast("User sudah ada", "error");
  store[u] = { password: p, role: r };
  localStorage.setItem("user_store", JSON.stringify(store));
  renderUserSetting();
  showToast("User ditambahkan", "success");
}

function restoreFromJSON(jsonData) {
  Object.entries(jsonData).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  });
  showToast("Data berhasil dipulihkan", "success");
}
function handleLogin() {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  const role = loginUser(u, p);
  if (role) {
    showAppFor(u);
    showToast("Login berhasil", "success");
  } else {
    showToast("Login gagal", "error");
  }
}
function handleRestore(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const json = JSON.parse(reader.result);
      restoreFromJSON(json);
    } catch (e) {
      showToast("Format JSON tidak valid", "error");
    }
  };
  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  initUserStore();
  SIDEBAR.classList.add("hidden");
  APP_PLACEHOLDER.classList.add("hidden");
  LOGIN_BOX.style.display = "block";

  const logged = localStorage.getItem("logged_in_user");
  if (logged) showAppFor(logged);
});

