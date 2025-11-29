// layout.js
document.addEventListener("DOMContentLoaded", function () {
    /* ========== LOAD HEADER ========== */
    const headerContainer = document.getElementById("header");
    if (headerContainer) {
        fetch("/header.html")
            .then(response => response.text())
            .then(html => {
                headerContainer.innerHTML = html;
                //setActiveMenu();          // tô sáng menu đang active
                setActiveNav();
            })
            .catch(err => console.error("Không load được header:", err));
    }

    /* ========== LOAD FOOTER ========== */
    const footerContainer = document.getElementById("footer");
    if (footerContainer) {
        fetch("/footer.html")
            .then(response => response.text())
            .then(html => {
                footerContainer.innerHTML = html;
                initBackToTop();          // gắn sự kiện cho mũi tên sau khi footer đã load
            })
            .catch(err => console.error("Không load được footer:", err));
    }

    /* ========== LOAD NỘI DUNG CHÍNH VÀO <main> ========== */
    const mainContainer = document.getElementById("main");
    if (mainContainer) {
        // lấy tên page từ data-page trên <body>
        const page = document.body.dataset.page || "home";
        const contentFile = `/content-${page}.html`;

        fetch(contentFile)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Không tìm thấy file content: " + contentFile);
                }
                return response.text();
            })
            .then(html => {
                mainContainer.innerHTML = html;
                initBackToTop();   // sau khi content được chèn vào DOM
                initContactForm(); // gắn event cho form liên hệ (nếu có)
            })
            .catch(err => console.error("Không load được content:", err));
    }
});


/* ======================================================
   Tô sáng menu đang active theo URL hiện tại
   ====================================================== */
/*
function setActiveMenu() {
    const current = window.location.pathname.split("/").pop() || "index.html";
    const links = document.querySelectorAll(".main-nav a");

    links.forEach(a => {
        const href = a.getAttribute("href");
        if (href === current) {
            a.classList.add("active");
        }
    });
}
*/

/* ======================================================
   Mũi tên nhỏ dưới banner liên hệ – scroll lên đầu trang
   ====================================================== */
function initBackToTop() {
    // mũi tên nằm trong footer.html, class="contact-cta-pointer"
    const pointer = document.querySelector(".contact-cta-pointer");
    if (!pointer) return; // nếu footer chưa có mũi tên thì bỏ qua

    // Tránh gắn event nhiều lần
    if (pointer.dataset.bound === "1") return;
    pointer.dataset.bound = "1";

    // click vào tam giác -> scroll lên đầu trang
    pointer.addEventListener("click", (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    });

    // (tuỳ chọn) nếu muốn mũi tên chỉ hiện khi scroll xuống dưới
    /*
    function togglePointer() {
        if (window.scrollY > 200) {
            pointer.style.opacity = "1";
            pointer.style.pointerEvents = "auto";
        } else {
            pointer.style.opacity = "0.6";
            pointer.style.pointerEvents = "auto";
        }
    }
    togglePointer();
    window.addEventListener("scroll", togglePointer);
    */
}

// === ĐÁNH DẤU MENU ĐANG ACTIVE THEO URL ===
function setActiveNav() {
    const path = window.location.pathname;      // ví dụ: "/", "/gioi-thieu.html", "/san-pham/khoa-than-loc-mau"
    const navLinks = document.querySelectorAll(".main-nav a");

    navLinks.forEach(link => {
        const href = link.getAttribute("href"); // ví dụ: "/", "/gioi-thieu.html", "/san-pham.html"

        // 1. Trang chủ
        if (href === "/" && (path === "/" || path === "/index.html")) {
            link.classList.add("active");
            return;
        }

        // 2. Các trang .html bình thường (gioi-thieu, tuyen-dung, lien-he…)
        if (href.endsWith(".html")) {
            // lấy “key” chính: "gioi-thieu", "san-pham"...
            const key = href.replace(".html", "").replace("/", "");    // "/gioi-thieu.html" -> "gioi-thieu"

            // nếu URL hiện tại bắt đầu bằng /key thì active
            if (path === `/${key}.html` || path.startsWith(`/${key}/`)) {
                link.classList.add("active");
                return;
            }
        }
    });
}

function initContactForm() {
    const form = document.querySelector("#contact-form");
    if (!form) return;

    // tránh gắn sự kiện nhiều lần
    if (form.dataset.bound === "1") return;
    form.dataset.bound = "1";

    const statusEl = document.getElementById("contact-form-status");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = {
            name: form.name.value.trim(),
            email: form.email.value.trim(),
            phone: form.phone.value.trim(),
            subject: form.subject.value.trim(),
            message: form.message.value.trim(),
        };

        if (!formData.name || !formData.email || !formData.message) {
            if (statusEl) {
                statusEl.textContent = "Vui lòng điền đầy đủ Họ tên, Email và Nội dung.";
                statusEl.style.color = "#b91c1c";
            }
            return;
        }

        try {
            if (statusEl) {
                statusEl.textContent = "Đang gửi, vui lòng chờ...";
                statusEl.style.color = "#52606d";
            }

            const res = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const result = await res.json();

            if (res.ok && result.success) {
                if (statusEl) {
                    statusEl.textContent = "Gửi liên hệ thành công. Cảm ơn bạn!";
                    statusEl.style.color = "#047857";
                }
                form.reset();
            } else {
                throw new Error(result.message || "Có lỗi khi gửi liên hệ.");
            }
        } catch (err) {
            console.error(err);
            if (statusEl) {
                statusEl.textContent = "Không gửi được email. Vui lòng thử lại sau.";
                statusEl.style.color = "#b91c1c";
            }
        }
    });
}
