// server.js
require("dotenv").config();          // đọc biến trong .env

const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 3000;

// 0. Thêm middleware đọc body
// Cho phép đọc JSON & form-data gửi từ frontend
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Kết nối MySQL
const pool = mysql.createPool({
  host: "localhost",
  user: "root",      // sửa nếu bạn dùng user khác
  password: "",      // nếu MySQL có password thì điền vào
  database: "cts_website",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 2. Cấu hình Nodemailer dùng thông tin trong .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 2. Cấu hình EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 3. Serve static (css, js, hình…)
app.use(express.static(path.join(__dirname, "public")));

// 4. Danh sách chuyên khoa (tạm thời viết cứng ở đây)
const specialties = [
  { slug: "khoa-than-loc-mau",           name: "Thiết bị Khoa Thận - Lọc máu" },
  { slug: "khoa-xet-nghiem",             name: "Thiết bị Khoa Xét nghiệm" },
  { slug: "khoa-phau-thuat-gay-me",      name: "Thiết bị Khoa Phẫu thuật - Gây mê" },
  { slug: "khoa-hoi-suc-cap-cuu",        name: "Thiết bị Khoa Hồi sức – Cấp cứu" },
  { slug: "khoa-duoc",                   name: "Thiết bị Khoa Dược" },
  { slug: "khoa-chan-doan-hinh-anh",     name: "Thiết bị Khoa Chuẩn đoán hình ảnh" },
  { slug: "khoa-noi-tim-mach",           name: "Thiết bị Khoa Nội tim mạch" },
  { slug: "khoa-rang-ham-mat",           name: "Thiết bị Khoa Răng hàm mặt" },
  { slug: "khoa-kiem-soat-nhiem-khuan",  name: "Thiết bị Khoa Kiểm soát nhiễm khuẩn" },
];

// 5. Trang chủ: dùng index.html trong /public
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 6. Trang hub Sản phẩm (san-pham.html tĩnh hiện tại)
app.get("/san-pham.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "san-pham.html"));
});

// 7. Trang sản phẩm theo chuyên khoa: /san-pham/:slug
app.get("/san-pham/:slug", async (req, res) => {
  const slug = req.params.slug;

  // Tìm chuyên khoa tương ứng trong mảng specialties
  const specialty = specialties.find((s) => s.slug === slug);
  if (!specialty) {
    return res.status(404).send("Không tìm thấy chuyên khoa.");
  }

  try {
    // Lấy danh sách sản phẩm thuộc chuyên khoa này
    const [products] = await pool.query(
      "SELECT id, name, slug, short_description, image_path FROM products WHERE specialty_slug = ?",
      [slug]
    );

    // Render ra specialty-products.ejs
    res.render("specialty-products", {
      pageTitle: specialty.name,
      specialtyName: specialty.name,
      slug,          // để EJS biết đang ở slug nào -> gắn class active
      specialties,   // truyền mảng specialties xuống template
      products,      // danh sách sản phẩm
    });
  } catch (err) {
    console.error("Lỗi lấy dữ liệu:", err);
    res.status(500).send("Có lỗi xảy ra khi lấy dữ liệu sản phẩm.");
  }
});

// 7b. Trang chi tiết sản phẩm: /san-pham/:specialtySlug/:productSlug
app.get("/san-pham/:specialtySlug/:productSlug", async (req, res) => {
  const { specialtySlug, productSlug } = req.params;

  // Tìm chuyên khoa (để hiện sidebar + breadcrumb)
  const specialty = specialties.find((s) => s.slug === specialtySlug);
  if (!specialty) {
    return res.status(404).send("Không tìm thấy chuyên khoa.");
  }

  try {
    // Lấy 1 sản phẩm theo slug + specialty_slug để chắc chắn đúng chuyên khoa
    const [rows] = await pool.query(
      "SELECT name, slug, short_description, description, specs, image_path FROM products WHERE slug = ? AND specialty_slug = ? LIMIT 1",
      [productSlug, specialtySlug]
    );

    if (rows.length === 0) {
      return res.status(404).send("Không tìm thấy sản phẩm.");
    }

    const product = rows[0];

    res.render("product-detail", {
      pageTitle: `${product.name} - ${specialty.name}`,
      specialtyName: specialty.name,
      specialties,
      specialtySlug,
      product,
    });
  } catch (err) {
    console.error("Lỗi lấy dữ liệu sản phẩm chi tiết:", err);
    res.status(500).send("Có lỗi xảy ra khi lấy dữ liệu sản phẩm.");
  }
});

// Thêm route POST /app/contact
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  const mailSubject = subject && subject.trim()
    ? `[Website CTS] ${subject.trim()}`
    : "[Website CTS] Liên hệ mới từ khách hàng";

  const textBody =
`Bạn nhận được 1 liên hệ mới từ website CTS:

Họ & tên: ${name || ""}
Email: ${email || ""}
Điện thoại: ${phone || ""}

Nội dung:
${message || ""}`;

  const htmlBody = `
    <p><strong>Bạn nhận được 1 liên hệ mới từ website CTS:</strong></p>
    <p><strong>Họ &amp; tên:</strong> ${name || ""}</p>
    <p><strong>Email:</strong> ${email || ""}</p>
    <p><strong>Điện thoại:</strong> ${phone || ""}</p>
    <p><strong>Nội dung:</strong><br>${(message || "").replace(/\n/g, "<br>")}</p>
  `;

  try {
    await transporter.sendMail({
      from: `"Website CTS" <thietbiyte.cts@gmail.com>`,
      to: "thietbiyte.cts@gmail.com",   //  email công ty để nhận liên hệ từ website
      subject: mailSubject,
      text: textBody,
      html: htmlBody,
    });

    res.json({ success: true, message: "Email đã được gửi." });
  } catch (err) {
    console.error("Lỗi gửi email:", err);
    res.status(500).json({ success: false, message: "Không gửi được email." });
  }
});

// 7. API nhận form liên hệ từ trang /lien-he
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  // Tiêu đề mail
  const mailSubject = subject && subject.trim()
    ? `[Website CTS] ${subject.trim()}`
    : "[Website CTS] Liên hệ mới từ khách hàng";

  // Nội dung bản text
  const textBody =
`Bạn nhận được một liên hệ mới từ website CTS:

Họ & tên: ${name || ""}
Email:    ${email || ""}
Điện thoại: ${phone || ""}

Nội dung:
${message || ""}`;

  // Nội dung bản HTML
  const htmlBody = `
    <p><strong>Bạn nhận được một liên hệ mới từ website CTS:</strong></p>
    <p><strong>Họ &amp; tên:</strong> ${name || ""}</p>
    <p><strong>Email:</strong> ${email || ""}</p>
    <p><strong>Điện thoại:</strong> ${phone || ""}</p>
    <p><strong>Nội dung:</strong><br>${(message || "").replace(/\n/g, "<br>")}</p>
  `;

  try {
    await transporter.sendMail({
      from: `"Website CTS" <${process.env.SMTP_USER}>`,
      // 👇 Mail công ty sẽ nhận thông tin – bạn đổi thành mail mong muốn
      to: "thietbiyte.cts@gmail.com",
      subject: mailSubject,
      text: textBody,
      html: htmlBody,
    });

    // Trả về JSON cho frontend biết là OK
    res.json({ success: true, message: "Đã gửi email liên hệ." });
  } catch (err) {
    console.error("Lỗi gửi email liên hệ:", err);
    res
      .status(500)
      .json({ success: false, message: "Không gửi được email, vui lòng thử lại sau." });
  }
});

// 8. Start server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
