import { firebaseConfig } from "./config.js";

console.log("script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

let quotes = [];

// Show Section Function
window.showSection = function (section) {
  document.querySelectorAll(".section").forEach((sec) => {
    sec.classList.remove("active");
    sec.style.display = "none"; 
  });

  const sectionElement = document.getElementById(section);
  if (sectionElement) {
    sectionElement.classList.add("active");
    sectionElement.style.display = "block"; 
    console.log(`Showing section: ${section}`);
  } else {
    console.error(`Section '${section}' not found.`);
  }
};

// Login Functionality 
window.login = async function () {
  const email = prompt("Enter your email:");
  const password = prompt("Enter your password:");

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Logged in as:", userCredential.user.email);
    alert("Login successful!");
  } catch (error) {
    console.error("Login failed:", error.message);
    alert("Login failed: " + error.message);
  }
};

window.logout = function () {
  signOut(auth).then(() => console.log("Logged out"));
};

// ** Monitor Auth State & Check Admin Permissions **
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User logged in:", user.email);

    try {
      const idTokenResult = await user.getIdTokenResult();
      const isAdmin = idTokenResult.claims.email === user.email; // Uses Firebase rules for validation

      if (isAdmin) {
        document.getElementById("addQuoteBtn").style.display = "block";
        document.getElementById("logoutBtn").style.display = "inline-block";
        document.getElementById("loginBtn").style.display = "none";
      } else {
        alert("Unauthorized user");
      }
    } catch (error) {
      console.error("Error checking admin permissions:", error);
    }
  } else {
    console.log("User logged out");
    document.getElementById("addQuoteBtn").style.display = "none";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("loginBtn").style.display = "inline-block";
  }
});

//  Load Quotes from Firestore 
async function loadQuotes() {
  try {
    console.log("Loading quotes...");
    const querySnapshot = await getDocs(collection(db, "quotes"));

    if (querySnapshot.empty) {
      console.log("No quotes found in Firestore.");
      return;
    }

    quotes = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      text: doc.data().text,
    }));

    console.log("Quotes loaded:", quotes.length);
    populateQuotesGrid();
    startScrolling();
  } catch (error) {
    console.error("Error loading quotes:", error);
  }
}

//  Scrolling Text Animation 
function startScrolling() {
  const scrollContainer = document.querySelector(".scroll-container");

  function createQuoteElement(quote, speedClass) {
    const span = document.createElement("span");
    span.textContent = quote.text;
    span.classList.add(speedClass);

    const randomTop = Math.random() * window.innerHeight;
    span.style.top = `${randomTop}px`;

    scrollContainer.appendChild(span);

    setTimeout(() => {
      scrollContainer.removeChild(span);
    }, parseInt(getComputedStyle(span).animationDuration) * 1000);
  }

  setInterval(() => {
    if (quotes.length > 0) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      const speedClass = Math.random() < 0.33 ? "fast" : Math.random() < 0.66 ? "medium" : "slow";
      createQuoteElement(randomQuote, speedClass);
    }
  }, 1000);
}

// Populate Quotes Grid with Delete Option 
function populateQuotesGrid() {
  const grid = document.getElementById("quoteGrid");
  grid.innerHTML = "";

  quotes.forEach(async (quote) => {
    const div = document.createElement("div");
    div.className = "quote";
    div.textContent = quote.text;

    if (auth.currentUser) {
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      const isAdmin = idTokenResult.claims.email === auth.currentUser.email;

      if (isAdmin) {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = async () => {
          if (confirm("Are you sure you want to delete this quote?")) {
            await deleteDoc(doc(db, "quotes", quote.id));
            loadQuotes();
          }
        };
        div.appendChild(deleteBtn);
      }
    }
    grid.appendChild(div);
  });
}

//  Generate a Random Quote 
window.generateQuote = function () {
  if (quotes.length > 0) {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    document.getElementById("randomQuote").textContent = quotes[randomIndex].text;
  }
};

//  Add a New Quote to Firestore 
window.addNewQuote = async function () {
  const newQuote = document.getElementById("newQuote").value;
  if (newQuote.trim() === "") return alert("Please enter a quote");

  try {
    await addDoc(collection(db, "quotes"), { text: newQuote });
    alert("Quote added successfully!");
    loadQuotes();
  } catch (error) {
    alert("Error adding quote: " + error.message);
  }
};

// ** Load Quotes on Page Load **
window.onload = function () {
  loadQuotes(); 
  showSection("randomQuoteSection"); 
};