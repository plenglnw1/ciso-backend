const express = require("express");
const passport = require("passport");
const session = require("express-session");
const cors = require("cors");
require("./auth");
require("dotenv").config();

const SERVER_URL = process.env.SERVER_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const ROLES = {
  GUEST: "guest",
  MEMBER: "member",
  LAB_MANAGER: "lab_manager",
  ADMIN: "admin",
};

const getUserRole = (email) => {
  if (!email) return ROLES.GUEST;

  // Admin - เมลแล็บเฉพาะ
  if (email === ADMIN_EMAIL) {
    return ROLES.ADMIN;
  }

  // Lab Manager - เมลที่มี @lab. หรือ manager
  if (email.includes("@ku.th")) {
    return ROLES.LAB_MANAGER;
  }

  // Member - เมลที่ verified
  if (email && email.includes("@")) {
    return ROLES.MEMBER;
  }

  return ROLES.GUEST;
};

const isLoggedIn = (req, res, next) => {
  req.user ? next() : res.sendStatus(401);
};

// Middleware สำหรับตรวจสอบสิทธิ์
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRole = getUserRole(req.user.emails?.[0]?.value);

    if (allowedRoles.includes(userRole)) {
      req.userRole = userRole;
      next();
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  };
};

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(
  session({
    secret: "cats",
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: "lax", // หรือ 'none' ถ้าใช้งานข้าม domain (ต้องใช้ HTTPS ด้วย)
      secure: false, // ✅ ถ้าเป็น HTTPS ค่อยตั้ง true
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
// app.use(express.json());

app.get("/", (req, res) => {
  res.send('<a href="/auth/google">Authenticate with Google</a>');
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

// app.get("/google/callback",
//     passport.authenticate('google', {
//         successRedirect: '/protected',
//         failureRedirect: '/auth/failure'
//     })
// );

app.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:3000/auth/callback",
    failureRedirect: "http://localhost:3000/auth/failure",
  })
);

app.get("/auth/failure", (req, res) => {
  res.send("Authentication failed!");
});

// API สำหรับตรวจสอบสถานะ user
app.get("/api/user", (req, res) => {
  if (!req.user) {
    return res.json({
      isAuthenticated: false,
      user: null,
      role: ROLES.GUEST,
    });
  }

  const email = req.user.emails?.[0]?.value;
  const role = getUserRole(email);

  console.log(email);

  res.json({
    isAuthenticated: true,
    user: {
      id: req.user.id,
      displayName: req.user.displayName,
      email: email,
      photo: req.user.photos?.[0]?.value,
    },
    role: role,
  });
});

// Protected routes with role-based access
app.get(
  "/api/dashboard",
  isLoggedIn,
  requireRole([ROLES.ADMIN, ROLES.LAB_MANAGER]),
  (req, res) => {
    res.json({
      message: "Dashboard data",
      role: req.userRole,
      canEdit: req.userRole === ROLES.ADMIN,
    });
  }
);

app.get(
  "/api/user-management",
  isLoggedIn,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.json({ message: "User management data" });
  }
);

app.get(
  "/api/bookings",
  isLoggedIn,
  requireRole([ROLES.MEMBER, ROLES.LAB_MANAGER, ROLES.ADMIN]),
  (req, res) => {
    res.json({ message: "Bookings data" });
  }
);

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie("connect.sid"); // ✅ เคลียร์ cookie ด้วย
      res.status(200).json({ message: "Logged out successfully" }); // ✅ ส่ง response กลับ
    });
    // res.redirect("http://localhost:3000");
  });
});

app.get("/protected", isLoggedIn, (req, res) => {
  res.send(`Hello! ${req.user.displayName}`);
  console.log(req.user);
});

app.listen(3001, () => console.log(`Server running on ${SERVER_URL}`));
