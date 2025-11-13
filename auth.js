
function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const message = document.getElementById("signupMessage");

    const users = getUsers();

    // Check if user already exists
    const existing = users.find(
      (u) => u.email === email || u.username === username
    );

    if (existing) {
      message.textContent = "Username or email already exists. Try logging in.";
      message.classList.add("text-danger");
    } else {
      // Create new user
      users.push({ name, email, username, password });
      saveUsers(users);

      message.textContent = "Signup successful! Redirecting to login...";
      message.classList.remove("text-danger");
      message.classList.add("text-success");

      setTimeout(() => (window.location.href = "login.html"), 1500);
    }
  });
}

// LOGIN LOGIC
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const loginInput = document.getElementById("loginInput").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const message = document.getElementById("loginMessage");

    const users = getUsers();
    const found = users.find(
      (u) =>
        (u.email === loginInput || u.username === loginInput) &&
        u.password === password
    );

    if (found) {
      localStorage.setItem("currentUser", JSON.stringify(found));
      message.classList.remove("text-danger");
      message.classList.add("text-success");
      message.textContent = "Login successful! Redirecting...";

      setTimeout(() => (window.location.href = "index.html"), 1500);
    } else {
      message.textContent = "Invalid username/email or password.";
      message.classList.add("text-danger");
    }
  });
}
